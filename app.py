from flask import Flask, render_template, request, jsonify
import math

app = Flask(__name__)

INVESTMENT_TYPES = [
    {"name": "Bank Savings Account", "rate": 0.001, "color": "#94a3b8", "risk": "Very Low",
     "best_for": "Emergency funds"},
    {"name": "Fixed Deposit", "rate": 0.01, "color": "#60a5fa", "risk": "Low", "best_for": "Short-term goals"},
    {"name": "CPF Ordinary Account", "rate": 0.025, "color": "#34d399", "risk": "Very Low",
     "best_for": "Housing/Retirement"},
    {"name": "Bond Funds", "rate": 0.04, "color": "#fbbf24", "risk": "Low-Medium", "best_for": "Steady income"},
    {"name": "Index Funds", "rate": 0.06, "color": "#f97316", "risk": "Medium", "best_for": "Long-term wealth"},
    {"name": "Stocks", "rate": 0.08, "color": "#f43f5e", "risk": "High", "best_for": "Maximum growth"},
]

SCENARIOS = {
    "student": {"name": "🎓 Student", "starting": 1000, "monthly": 200, "income": 20000,
                "desc": "Just starting out, small savings"},
    "professional": {"name": "💼 Young Professional", "starting": 10000, "monthly": 1000, "income": 60000,
                     "desc": "First job, building wealth"},
    "family": {"name": "🏠 Family Person", "starting": 50000, "monthly": 1500, "income": 80000,
               "desc": "Mid-career, family goals"},
    "high_earner": {"name": "⚡ High Earner", "starting": 100000, "monthly": 3000, "income": 120000,
                    "desc": "Accelerating to freedom"},
}


def years_to_target(pv, pmt, rate, fv):
    if rate == 0:
        if pmt == 0:
            return float('inf')
        return (fv - pv) / pmt
    try:
        A = fv + pmt / rate
        B = pv + pmt / rate
        if B <= 0 or A <= 0:
            return float('inf')
        n = math.log(A / B) / math.log(1 + rate)
        return max(n, 0)
    except (ValueError, ZeroDivisionError):
        return float('inf')


def portfolio_value_at_year(pv, pmt, rate, n):
    if rate == 0:
        return pv + pmt * n
    return pv * (1 + rate) ** n + pmt * ((1 + rate) ** n - 1) / rate


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/basics")
def basics():
    return render_template("basics.html")


@app.route("/calculator")
def calculator():
    return render_template("calculator.html", investment_types=INVESTMENT_TYPES, scenarios=SCENARIOS)


@app.route("/compare")
def compare():
    return render_template("compare.html", investment_types=INVESTMENT_TYPES)


@app.route("/api/calculate", methods=["POST"])
def calculate():
    data = request.get_json()
    pv = float(data.get("starting_amount", 5000))
    pmt = float(data.get("annual_investment", 6000))
    annual_income = float(data.get("annual_income", 45000))

    results = []
    for inv in INVESTMENT_TYPES:
        r = inv["rate"]

        q1_years = years_to_target(pv, pmt, r, 100_000)
        q2_years = years_to_target(100_000, pmt, r, 500_000)
        q3_years = years_to_target(500_000, pmt, r, 2_500_000)

        if r > 0:
            fv4 = pmt / r
            q4_years = years_to_target(pv, pmt, r, fv4)
            fv5 = annual_income / r
            q5_years = years_to_target(pv, pmt, r, fv5)
        else:
            fv4 = float('inf')
            q4_years = float('inf')
            fv5 = float('inf')
            q5_years = float('inf')

        def fmt_years(y):
            if y == float('inf') or y > 9999:
                return None
            return math.ceil(y)

        curve = []
        max_years = min(fmt_years(q5_years) or 80, 80)
        for y in range(0, max_years + 1):
            curve.append({"year": y, "value": round(portfolio_value_at_year(pv, pmt, r, y), 2)})

        results.append({
            "name": inv["name"],
            "rate": r,
            "rate_pct": f"{r * 100:.1f}%",
            "color": inv["color"],
            "risk": inv["risk"],
            "best_for": inv["best_for"],
            "q1_years": fmt_years(q1_years),
            "q2_years": fmt_years(q2_years),
            "q3_years": fmt_years(q3_years),
            "q4_years": fmt_years(q4_years),
            "q4_target": round(fv4, 2) if fv4 != float('inf') else None,
            "q5_years": fmt_years(q5_years),
            "q5_target": round(fv5, 2) if fv5 != float('inf') else None,
            "curve": curve,
        })

    return jsonify({"results": results, "pmt": pmt, "annual_income": annual_income, "pv": pv})


@app.route("/api/compare", methods=["POST"])
def compare_calculate():
    data = request.get_json()
    pv = float(data.get("starting_amount", 10000))
    pmt = float(data.get("monthly", 500)) * 12
    years = int(data.get("years", 30))

    results = []
    for inv in INVESTMENT_TYPES:
        final_value = portfolio_value_at_year(pv, pmt, inv["rate"], years)
        total_contributions = pv + pmt * years
        total_earnings = final_value - total_contributions

        results.append({
            "name": inv["name"],
            "rate_pct": f"{inv['rate'] * 100:.1f}%",
            "color": inv["color"],
            "final_value": round(final_value, 2),
            "total_contributions": round(total_contributions, 2),
            "total_earnings": round(total_earnings, 2),
            "risk": inv["risk"],
        })

    return jsonify({"results": results, "years": years})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
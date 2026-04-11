# 📈 InvestEd - Learn to Invest

**InvestEd** is a beginner-friendly web application built to demystify investing. It combines clear, jargon-free educational lessons with powerful interactive tools to help users visualize the impact of compound interest and plan their journey toward financial freedom.

---

## 🚀 Key Features

### 🧮 Freedom Calculator
The core tool of the app that calculates how long it will take to reach your "Freedom Number."
- **Interactive Projections:** Uses **Chart.js** to render growth curves for 6 different asset classes simultaneously.
- **Dynamic Milestones:** Automatically calculates the years required to hit specific wealth markers: $100K, $500K, and $2.5M.
- **Scenario Presets:** Quick-load buttons for different life stages (Student, Professional, Family, and High Earner) to see realistic starting points.
- **The 4% Rule:** Integrated logic to show how much annual income your portfolio can safely generate.

### ⚖️ Compare Tool
A dedicated analysis page for side-by-side asset comparison.
- **Asset Classes:** Includes real-world rates for Bank Savings (0.1%), Fixed Deposits (1%), CPF OA (2.5%), Bond Funds (4%), Index Funds (6%), and Stocks (8%).
- **Visual Breakdown:** Dynamic bar charts comparing "Total Contributed" vs. "Total Earned" over your chosen time horizon.

### 📚 Basics Lessons
- **Compound Interest Demo:** A "live" math playground where users see how small changes in interest rates lead to massive differences over time.
- **Wealth Milestones:** Explanations of what different portfolio sizes mean for lifestyle and retirement.

---

## 🛠️ Tech Stack

- **Backend:** Python (Flask)
- **Frontend:** Modern HTML5, CSS3 (Custom Dark Theme), Vanilla JavaScript (ES6)
- **Data Visualization:** Chart.js
- **Styling:** Custom-built UI using CSS variables for a sleek, financial-tech aesthetic.

---

## 📂 Project Structure

```text
InvestEd/
├── app.py              # Flask server & backend calculation logic
├── requirements.txt    # Project dependencies (Flask)
├── static/
│   ├── css/
│   │   └── style.css   # Main stylesheet (Dark mode, custom UI)
│   └── js/
│       └── script.js   # Frontend logic, Chart.js config, & UI handling
└── templates/          # HTML Templates
    ├── index.html      # Landing Page
    ├── basics.html     # Educational Content
    ├── calculator.html # Freedom Calculator UI
    └── compare.html    # Investment Comparison UI

---
## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation

```bash
# 1. Clone the repository
git clone [https://github.com/KangBin2005/InvestEd.git](https://github.com/KangBin2005/InvestEd.git)
cd InvestEd

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
python app.py

# 4. Open your browser to http://localhost:5000
```
---

## 🧪 The Math Behind the App

The application uses the **Future Value of an Ordinary Annuity** formula to calculate growth with monthly contributions:

$$FV = PV(1 + r)^n + PMT \left[ \frac{(1 + r)^n - 1}{r} \right]$$

* **PV**: Starting Amount (Initial Principal)
* **PMT**: Annual Contribution (Monthly Investment × 12)
* **r**: Annual Interest Rate (Decimal)
* **n**: Number of Years

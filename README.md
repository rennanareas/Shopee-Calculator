# Shopee Expense Calculator

A Google Chrome extension that helps you track your spending on **Shopee Brazil**, gathering and totaling order amounts in a simple and practical interface.

## ✨ Features

- 📦 Counts the orders found on the loaded page.
- 🧾 Separates purchased orders from canceled or refunded ones.
- 💰 Calculates totals by order status category.
- 🧮 Displays the overall sum of all identified orders.
- ⚡ Computes totals directly from the orders loaded on the **My Purchases** (*Minhas Compras*) page.

## 🚀 How to Use

1. Log in to your **Shopee Brazil** account.
2. Open the **My Purchases** (*Minhas Compras*) page.
3. Wait for the orders you want to analyze to finish loading.
4. Open the **Shopee Expense Calculator** extension.
5. Click **Calculate Expenses** (*Calcular Gastos*).
6. Review the displayed totals.

## 🛠️ Tech Stack

- JavaScript
- HTML
- CSS
- Chrome Extensions API

## 💻 Local Development Setup

Clone this repository:

```bash
git clone https://github.com/rennanareas/Shopee-Calculator.git
```

Then load the extension in Chrome:

1. Open `chrome://extensions` in Google Chrome.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the project folder containing the `manifest.json` file.

## 🔒 Privacy

This extension uses order information displayed on the Shopee page solely to perform the calculations. Data handling practices and requested permissions reflect the extension's actual functionality. Please refer to the published Privacy Policy for more details.

- **Privacy Policy:** *Add the public link to your privacy policy here.*

## ⚠️ Notes

- Calculations only consider orders that the extension can identify on the currently loaded page.
- Accuracy depends on Shopee's page structure and the order statuses recognized by the extension.
- Updates to Shopee's website layout may require adjustments to the extension's code.

## 👨‍💻 Author

Developed by **Rennan Alves**, with the support of AI coding assistants.

If you find this project useful, feel free to follow its progress through this repository!

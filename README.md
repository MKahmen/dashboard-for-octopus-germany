# Dashboard for Octopus Germany

A smart meter dashboard for Octopus Energy Germany customers to view consumption data and costs.

**Note:** This software is specifically designed for the Octopus Energy Germany **Heat tariff** with its three price tiers.

This project uses the Octopus Energy Germany GraphQL API as described here:
https://octopusenergy.de/blog/ratgeber/auf-der-suche-nach-deutschen-energie-vorreitern

## Live Demo

https://octopus.mkay.io

Uses the example tariff prices: Low 18.49 ct/kWh, Standard 26.49 ct/kWh, High 30.49 ct/kWh.

## Features

- View daily consumption in 15-minute intervals
- View monthly consumption with daily summaries
- Cost breakdown by tariff tier (Low, Standard, High)
- Supports multiple accounts per user

## Setup

### Environment Variables

Create a `.env` file with your Heat tariff prices (in ct/kWh):

```
TARIFF_LOW_PRICE=18.49
TARIFF_STANDARD_PRICE=26.49
TARIFF_HIGH_PRICE=30.49
```

### Running

```bash
npm install
npm start
```

Then open http://localhost:3000

## Usage

1. Log in with your Octopus Energy Germany account
2. Select your account (if you have multiple)
3. Choose Daily or Monthly view
4. Select a date and click "Load Data"

## Heat Tariff Time Periods

- **Low**: 2:00-6:00 and 12:00-16:00
- **High**: 18:00-21:00
- **Standard**: All other hours

## Disclaimer

This is an independent, community-driven project and is not affiliated with, endorsed by, or connected to Octopus Energy Germany GmbH in any way. All trademarks and company names belong to their respective owners. This software is provided "as is" without warranty of any kind.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

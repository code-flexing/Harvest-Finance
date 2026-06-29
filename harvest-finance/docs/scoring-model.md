# Vault Strategy Performance Scoring Model

The vault strategy scoring system provides an objective, composite score (0-100) to help users evaluate and compare different yield strategies. The score is updated hourly.

## Components and Weights

The final score is a weighted average of four components:

1. **Risk-Adjusted APY (40%)**
   - Measures the expected return of the strategy.
   - Scaled such that a 20% APY corresponds to a maximum score component.

2. **TVL Stability (25%)**
   - Evaluates the total value locked (TVL) over time to ensure the strategy is not overly volatile and has a consistent capital base.

3. **Historical Drawdown (20%)**
   - Measures the peak-to-trough decline during the strategy's history. Strategies with lower max drawdowns score higher.

4. **Operator Reputation (15%)**
   - A qualitative score assigned to the strategy operator based on historical performance, security audits, and transparency.

## Algorithm Overview

`Score = (APY_Score * 0.40) + (TVL_Stability_Score * 0.25) + (Drawdown_Score * 0.20) + (Operator_Score * 0.15)`

Each component score is normalized to a 0-100 scale before weighting.

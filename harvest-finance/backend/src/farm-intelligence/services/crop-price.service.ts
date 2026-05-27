import { Injectable } from '@nestjs/common';

@Injectable()
export class CropPriceService {
  async getCurrentPrices() {
    return [
      { crop: 'Rice', market: 'West Bengal', price: 2200 },
      { crop: 'Wheat', market: 'Delhi', price: 2100 },
      { crop: 'Maize', market: 'Bihar', price: 1800 },
    ];
  }

  async getHistoricalPrices(crop: string) {
    return [
      { date: 'Mon', price: 2000 },
      { date: 'Tue', price: 2100 },
      { date: 'Wed', price: 2200 },
    ];
  }

  async getInsights() {
    const prices = await this.getCurrentPrices();

    return prices.map((p) => ({
      ...p,
      isHighDemand: p.price > 2300,
    }));
  }
}

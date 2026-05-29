import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { PortfolioService } from './portfolio.service';
import { PortfolioResponse } from './models/portfolio.model';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Resolver(() => PortfolioResponse)
export class PortfolioResolver {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Query(() => PortfolioResponse)
  @UseGuards(JwtAuthGuard)
  async portfolio(
    @Context() context: any,
    @Args('stellarAddresses', { type: () => [String], nullable: true })
    stellarAddresses?: string[],
  ): Promise<PortfolioResponse> {
    const user = context.req.user;
    return this.portfolioService.buildPortfolio(
      user.id,
      stellarAddresses || [],
    );
  }
}

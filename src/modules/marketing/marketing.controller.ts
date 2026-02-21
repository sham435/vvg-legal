import { Controller, Get, Post, Param, Body } from "@nestjs/common";
import { MarketingService } from "./marketing.service";

@Controller("marketing")
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get("overview")
  getOverview() {
    return this.marketingService.getOverview();
  }

  @Get("calendar")
  getCalendar() {
    return this.marketingService.getCalendar();
  }

  @Get("accounts")
  getAccounts() {
    return this.marketingService.getAccounts();
  }

  @Post("accounts/:platform/toggle")
  toggleAccount(@Param("platform") platform: string) {
    return this.marketingService.toggleAccount(platform);
  }
}

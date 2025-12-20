import { Injectable } from "@nestjs/common";

@Injectable()
export class MarketingService {
  getOverview() {
    return {
      reach: { value: "124.5K", change: "+12.5%", trend: "up" },
      engagement: { value: "5.2%", change: "+0.8%", trend: "up" },
      clicks: { value: "8,942", change: "-2.1%", trend: "down" },
      recentActivity: [
        {
          id: 1,
          text: 'Video "Viral Trend #1" posted to TikTok',
          time: "2 hours ago",
          status: "Success",
        },
        {
          id: 2,
          text: 'Video "Tech Review" posted to YouTube',
          time: "4 hours ago",
          status: "Success",
        },
        {
          id: 3,
          text: "Instagram Story scheduled",
          time: "5 hours ago",
          status: "Pending",
        },
      ],
    };
  }

  getCalendar() {
    return [
      {
        id: 1,
        date: 12,
        title: "Product Launch",
        time: "10:00 AM",
        type: "launch",
      },
      {
        id: 2,
        date: 15,
        title: "Weekly Digest",
        time: "2:00 PM",
        type: "content",
      },
      { id: 3, date: 18, title: "AMA Session", time: "5:00 PM", type: "live" },
    ];
  }

  getAccounts() {
    return {
      youtube: true,
      tiktok: false,
      instagram: true,
      facebook: false,
      twitter: false,
    };
  }

  toggleAccount(platform: string) {
    // In a real app, this would persist to the database/settings
    return {
      success: true,
      message: `Toggled ${platform} connection`,
      platform,
      // For demo, we just return the input for now
    };
  }
}

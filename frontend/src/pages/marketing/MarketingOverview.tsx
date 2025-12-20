import { BarChart3, TrendingUp, Users, ArrowUpRight, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function MarketingOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await api.marketing.getOverview();
        console.log('Marketing Overview Data:', response.data);
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch marketing overview:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading insights...</div>;
  if (!data) return <div className="p-6 text-center text-red-500">Failed to load data.</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Reach</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">{data.reach.value}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className={`flex items-center mt-4 text-sm font-medium ${data.reach.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {data.reach.trend === 'up' ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <TrendingUp className="w-4 h-4 mr-1 rotate-180" />}
            <span>{data.reach.change}</span>
            <span className="text-gray-400 font-normal ml-2">vs last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Engagement Rate</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">{data.engagement.value}</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className={`flex items-center mt-4 text-sm font-medium ${data.engagement.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {data.engagement.trend === 'up' ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <TrendingUp className="w-4 h-4 mr-1 rotate-180" />}
            <span>{data.engagement.change}</span>
            <span className="text-gray-400 font-normal ml-2">vs last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Clicks</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">{data.clicks.value}</h3>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className={`flex items-center mt-4 text-sm font-medium ${data.clicks.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {data.clicks.trend === 'up' ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <TrendingUp className="w-4 h-4 mr-1 rotate-180" />}
            <span>{data.clicks.change}</span>
            <span className="text-gray-400 font-normal ml-2">vs last month</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {data.recentActivity.map((activity: any) => (
            <div key={activity.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activity.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {activity.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

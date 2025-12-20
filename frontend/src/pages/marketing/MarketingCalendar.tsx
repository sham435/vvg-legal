import { Clock, MoreHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function MarketingCalendar() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dates = Array.from({ length: 35 }, (_, i) => i + 1); // Mock dates for grid
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCalendar() {
      try {
        const response = await api.marketing.getCalendar();
        setEvents(response.data);
      } catch (error) {
        console.error('Failed to fetch calendar:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCalendar();
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading calendar...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Content Calendar</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">Month</button>
            <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">Week</button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 border-b border-gray-100">
          {days.map(day => (
            <div key={day} className="py-3 text-center text-sm font-medium text-gray-500 border-r border-gray-100 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 auto-rows-fr bg-gray-50">
          {dates.map((date) => (
            <div key={date} className="min-h-[120px] bg-white p-2 border-b border-r border-gray-100 last:border-r-0 hover:bg-gray-50 transition-colors">
              <span className={`text-sm ${date === 12 ? 'bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-500'}`}>
                {date <= 31 ? date : ''}
              </span>
              
              {date === 12 && (
                <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors">
                  <p className="text-xs font-medium text-indigo-900 truncate">Product Launch</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-700">
                    <Clock className="w-3 h-3" />
                    10:00 AM
                  </div>
                </div>
              )}
               {date === 15 && (
                <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
                  <p className="text-xs font-medium text-purple-900 truncate">Weekly Digest</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-purple-700">
                    <Clock className="w-3 h-3" />
                    2:00 PM
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Schedule</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {events.map((event: any) => (
             <div key={event.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
               <div className="flex items-center gap-4">
                 <div className="p-2 bg-gray-100 rounded-lg text-center min-w-[50px]">
                   <span className="block text-xs text-gray-500 uppercase font-bold">DEC</span>
                   <span className="block text-lg font-bold text-gray-900">{event.date}</span>
                 </div>
                 <div>
                   <p className="font-medium text-gray-900">{event.title}</p>
                   <p className="text-sm text-gray-500">Scheduled for {event.time}</p>
                 </div>
               </div>
               <button className="text-gray-400 hover:text-gray-600">
                 <MoreHorizontal className="w-5 h-5" />
               </button>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}

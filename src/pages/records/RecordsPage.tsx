import { Link } from 'react-router-dom';
import { ClipboardList, Thermometer, FlaskConical, Bug, Droplets, ChevronRight, Beaker, Sprout } from 'lucide-react';
import { useCollection } from '../../data/hooks';
import type { CollectionName } from '../../data/schema';
import { Page, PageHeader } from '../../components/ui/Page';

const LOGS: { title: string; desc: string; to: string; icon: typeof Sprout; col: CollectionName }[] = [
  { title: 'Seed lots', desc: 'Stock, moisture content, viability', to: '/records/seeds', icon: ClipboardList, col: 'seedLots' },
  { title: 'Nursery batches', desc: 'Sowings and their linked records', to: '/nursery', icon: Sprout, col: 'batches' },
  { title: 'Climate log', desc: 'Temperature, humidity, light, CO₂', to: '/tools/environmental', icon: Thermometer, col: 'climateReadings' },
  { title: 'Nutrition log', desc: 'Fertigation doses, pH and EC', to: '/tools/treatments?tab=fertilizer', icon: FlaskConical, col: 'fertigationEvents' },
  { title: 'Pest & disease', desc: 'Scouting incidence and severity', to: '/tools/treatments?tab=pest', icon: Bug, col: 'pestObservations' },
  { title: 'Irrigation log', desc: 'Volume and method', to: '/tools/irrigation', icon: Droplets, col: 'irrigationEvents' },
  { title: 'Leachate tests', desc: 'Pour-through pH and EC', to: '/tools/substrate', icon: Beaker, col: 'leachateTests' },
];

const Row = ({ log }: { log: (typeof LOGS)[number] }) => {
  const { items } = useCollection(log.col);
  return (
    <Link to={log.to} className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors group">
      <div className="w-9 h-9 rounded-md bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
        <log.icon className="w-[18px] h-[18px] text-green-700" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900">{log.title}</h3>
        <p className="text-xs text-gray-500 truncate">{log.desc}</p>
      </div>
      <span className="font-mono-sci text-sm text-gray-500">{items.length}</span>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-700" />
    </Link>
  );
};

const RecordsPage = () => (
  <Page>
    <PageHeader title="Records & logs" subtitle="Every log in one place, with the number of records in each." back="/tools" />
    <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
      {LOGS.map(l => <Row key={l.title} log={l} />)}
    </div>
  </Page>
);

export default RecordsPage;

import { NavLink } from 'react-router-dom';
import { Activity, ThermometerSun, Leaf, Droplets, Map, Ruler, Database, FlaskConical, Beaker, MapPin, Skull, ShieldCheck, BookOpen, ChevronRight } from 'lucide-react';

const tools = [
  {
    category: 'Nursery records',
    items: [
      { title: 'Nursery Batches', desc: 'Sowings by bed, tray and seed lot', icon: Leaf, to: '/nursery' },
      { title: 'Records & Logs', desc: 'Seed lots, climate, nutrition, irrigation', icon: Database, to: '/records' },
      { title: 'Species Database', desc: 'Taxonomy and seed storage behaviour', icon: BookOpen, to: '/species' },
    ]
  },
  {
    category: 'Measurements',
    items: [
      { title: 'Environmental Logs', desc: 'Temperature range, RH, VPD, photoperiod', icon: ThermometerSun, to: '/tools/environmental' },
      { title: 'Germination Tracker', desc: 'Daily counts and mean germination time', icon: Activity, to: '/tools/germination' },
      { title: 'Treatment Logs', desc: 'Fertigation doses and pest incidence', icon: Droplets, to: '/tools/treatments' },
      { title: 'Morphometrics', desc: 'Sturdiness, shoot : root, Dickson index', icon: Ruler, to: '/tools/morphometrics' },
      { title: 'Spatial Mapping', desc: 'Bench and position layouts per house', icon: Map, to: '/tools/spatial' },
    ]
  },
  {
    category: 'Research & QA',
    items: [
      { title: 'Experimental Design', desc: 'CRD, RCBD, Latin square, split-plot', icon: FlaskConical, to: '/tools/experimental' },
      { title: 'Substrate & Nutrients', desc: 'Leachate EC and pH, substrate mixes', icon: Beaker, to: '/tools/substrate' },
      { title: 'Provenance & Lineage', desc: 'Collection site, GPS and collector', icon: MapPin, to: '/tools/provenance' },
      { title: 'Mortality Diagnostics', desc: 'Survival and losses by cause', icon: Skull, to: '/tools/mortality' },
      { title: 'Data Quality & Audit', desc: 'Instrument calibration schedule', icon: ShieldCheck, to: '/tools/audit' },
    ]
  }
];

const ToolsPage = () => (
  <div className="space-y-6 pb-8 animate-page-in">
    <header>
      <h1 className="text-2xl font-semibold text-gray-900">Tools</h1>
      <p className="text-sm text-gray-500 mt-1">Record, measure and audit nursery trials.</p>
    </header>

    {tools.map(section => (
      <section key={section.category}>
        <h2 className="sci-section-title mb-2">{section.category}</h2>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {section.items.map(item => (
            <NavLink key={item.to} to={item.to} className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors group">
              <div className="w-9 h-9 rounded-md bg-green-50 border border-green-100 flex items-center justify-center shrink-0 group-hover:bg-white">
                <item.icon className="w-[18px] h-[18px] text-green-700" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                <p className="text-xs text-gray-500 truncate">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-700 transition-colors" />
            </NavLink>
          ))}
        </div>
      </section>
    ))}
  </div>
);

export default ToolsPage;

import { memo } from 'react';
import { Zap, CreditCard, ShoppingCart, Cloud, Landmark } from 'lucide-react';

interface Template {
  exampleIndex: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  tags: string[];
}

const templates: Template[] = [
  {
    exampleIndex: 0,
    title: 'Payment System',
    description: 'Payment processing with RabbitMQ messaging, commands, and event-driven notifications.',
    icon: <CreditCard size={24} />,
    tags: ['Services', 'Events', 'Commands', 'Channels'],
  },
  {
    exampleIndex: 3,
    title: 'E-Commerce Platform',
    description: 'Multi-domain e-commerce architecture with orders, inventory, and shipping services.',
    icon: <ShoppingCart size={24} />,
    tags: ['Domains', 'Services', 'Events', 'Channels'],
  },
  {
    exampleIndex: 13,
    title: 'AWS Event Pipeline',
    description: 'Cloud-native event pipeline with EventBridge, SQS, SNS, and Lambda services.',
    icon: <Cloud size={24} />,
    tags: ['AWS', 'Events', 'Channels', 'Containers'],
  },
  {
    exampleIndex: 8,
    title: 'Banking Platform',
    description: 'Enterprise banking with subdomains for accounts, payments, lending, and compliance.',
    icon: <Landmark size={24} />,
    tags: ['Domains', 'Subdomains', 'Services', 'Events'],
  },
];

export const TemplatePicker = memo(function TemplatePicker({
  onSelect,
  onBlank,
}: {
  onSelect: (exampleIndex: number) => void;
  onBlank: () => void;
}) {
  return (
    <div className="template-picker-overlay">
      <div className="template-picker">
        <div className="template-picker-header">
          <div className="template-picker-logo">
            <Zap size={28} />
          </div>
          <h2>Welcome to EventCatalog Canvas</h2>
          <p>Pick a starter template to explore, or start from scratch.</p>
        </div>
        <div className="template-picker-grid">
          {templates.map((t) => (
            <button
              key={t.exampleIndex}
              className="template-card"
              onClick={() => onSelect(t.exampleIndex)}
            >
              <div className="template-card-icon">{t.icon}</div>
              <div className="template-card-body">
                <h3>{t.title}</h3>
                <p>{t.description}</p>
                <div className="template-card-tags">
                  {t.tags.map((tag) => (
                    <span key={tag} className="template-tag">{tag}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
        <button className="template-blank-btn" onClick={onBlank}>
          or start with a blank file
        </button>
      </div>
    </div>
  );
});

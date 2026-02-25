import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { HeroPreview, StepVisualizer } from '../components/HeroPreview';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();

  // Force dark theme for the landing page so visualizer + editor render dark
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, []);

  useEffect(() => {
    // Scroll reveal observer
    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const selectors = [
      '.reveal',
      '.reveal-left',
      '.reveal-right',
      '.reveal-scale',
      '.stagger-children',
      '.comp-slide-left',
      '.comp-slide-right',
      '.comp-arrow-anim',
      '.landing .divider',
    ];

    document.querySelectorAll(selectors.join(',')).forEach((el) => {
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const openPlayground = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/playground');
  };

  return (
    <div className="landing">
      {/* Nav */}
      <nav>
        <div className="nav-left">
          <a href="https://eventcatalog.dev" className="nav-brand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polygon points="12 2.5 14.12 14.12 12 12 9.88 14.12" fill="#ef4444" stroke="#ef4444" strokeWidth="0.5" />
              <polygon points="12 21.5 9.88 9.88 12 12 14.12 9.88" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="0.5" />
            </svg>
            EventCatalog
          </a>
          <div className="nav-divider"></div>
          <span className="nav-product">
            Compass<span className="nav-badge">Preview</span>
          </span>
        </div>
        <div className="nav-links">
          <a href="#how">How It Works</a>
          <a href="#usecases">Use Cases</a>
          <a href="https://eventcatalog.dev/docs">Docs</a>
          <a href="https://github.com/event-catalog" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="/playground" className="nav-cta" onClick={openPlayground}>
            Open Playground
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="dot"></span>
          Now in preview
        </div>
        <h1>
          You have the specs.
          <br />
          <span className="highlight">See the architecture.</span>
        </h1>
        <p className="hero-sub">
          Import your AsyncAPI and OpenAPI files, see how services connect, and export straight to EventCatalog.
        </p>
        <div className="hero-actions">
          <a href="/playground" className="btn-primary" onClick={openPlayground}>
            Open Playground &rarr;
          </a>
          <a href="#how" className="btn-ghost">
            How it works
          </a>
        </div>

        {/* Editor Preview — live playground */}
        <HeroPreview />

        {/* Value props row */}
        <div className="hero-pillars">
          <div className="hero-pillar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
              <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <div>
              <strong>DSL for architecture</strong>
              <span>Define domains, services, messages, and channels in one readable language</span>
            </div>
          </div>
          <div className="hero-pillar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
              <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <strong>Model with your specifications</strong>
              <span>Import messages, operations, and channels from your specs and model your architecture</span>
            </div>
          </div>
          <div className="hero-pillar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
              <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <strong>Export to documentation</strong>
              <span>Turns your architecture artifacts into documentation portal for your teams</span>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="logos-section">
        <div className="logos-label">EventCatalog is trusted by teams at</div>
        <div className="logos-row">
          <span>Nike</span>
          <span>GOV.UK</span>
          <span>AWS</span>
          <span>Ticketmaster</span>
          <span>Eurostar</span>
          <span>M&amp;S</span>
          <span>TUI</span>
          <span>Mazda</span>
        </div>
      </section>

      <div className="divider"></div>

      {/* Problem */}
      <section className="section section-center">
        <div className="section-label section-label-red reveal">The Problem</div>
        <h2 className="section-title reveal">Your architecture is invisible</h2>
        <p className="section-desc reveal">
          Specs describe individual APIs. Diagrams go stale. The full picture lives in someone's head.
        </p>
        <div className="bento-grid stagger-children">
          {/* Row 1: Wide + 2 regular */}
          <div className="bento-card bento-col-2">
            <div className="bento-text">
              <div className="bento-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.5" width="20" height="20">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Specs in silos</span>
              </div>
              <p>
                AsyncAPI, OpenAPI, Avro. Each describes one piece.<br />
                <strong>None shows how they connect.</strong>
              </p>
            </div>
            <div className="bento-viz">
              {/* Scattered file cards with no connections */}
              <div className="bento-files-scatter">
                <div className="bento-file-card" style={{ top: '8%', left: '5%' }}>
                  <div className="bento-file-dot bento-file-dot-cyan"></div>
                  <span>orders-asyncapi.yml</span>
                </div>
                <div className="bento-file-card" style={{ top: '8%', right: '8%' }}>
                  <div className="bento-file-dot bento-file-dot-green"></div>
                  <span>payments-openapi.yml</span>
                </div>
                <div className="bento-file-card" style={{ bottom: '24%', left: '12%' }}>
                  <div className="bento-file-dot bento-file-dot-cyan"></div>
                  <span>inventory-asyncapi.yml</span>
                </div>
                <div className="bento-file-card" style={{ bottom: '24%', right: '5%' }}>
                  <div className="bento-file-dot bento-file-dot-green"></div>
                  <span>shipping-openapi.yml</span>
                </div>
                {/* Dashed lines that go nowhere */}
                <svg className="bento-scatter-lines" viewBox="0 0 400 200" preserveAspectRatio="none">
                  <line x1="120" y1="40" x2="200" y2="100" stroke="var(--border-hover)" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                  <line x1="280" y1="40" x2="200" y2="100" stroke="var(--border-hover)" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                  <line x1="140" y1="150" x2="200" y2="100" stroke="var(--border-hover)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                  <line x1="300" y1="150" x2="200" y2="100" stroke="var(--border-hover)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                  <circle cx="200" cy="100" r="3" fill="var(--text-muted)" opacity="0.3" />
                </svg>
                <div className="bento-scatter-label">No connections</div>
              </div>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-text">
              <div className="bento-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5" width="20" height="20">
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Stale diagrams</span>
              </div>
              <p>
                That Miro board was accurate last quarter.
                <br />
                <strong>Now it's misleading anyone who trusts it.</strong>
              </p>
            </div>
            <div className="bento-viz">
              {/* Faded diagram mockup */}
              <div className="bento-stale-diagram">
                <div className="bento-stale-node" style={{ top: '10%', left: '25%' }}></div>
                <div className="bento-stale-node" style={{ top: '10%', right: '25%' }}></div>
                <div className="bento-stale-node" style={{ top: '50%', left: '50%', transform: 'translateX(-50%)' }}></div>
                <svg className="bento-stale-lines" viewBox="0 0 200 120" preserveAspectRatio="none">
                  <line x1="60" y1="25" x2="140" y2="25" stroke="var(--border-hover)" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                  <line x1="60" y1="25" x2="100" y2="70" stroke="var(--border-hover)" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                  <line x1="140" y1="25" x2="100" y2="70" stroke="var(--border-hover)" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                </svg>
                <div className="bento-stale-stamp">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>6 months ago</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-text">
              <div className="bento-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" width="20" height="20">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Tribal knowledge</span>
              </div>
              <p>
                The real architecture lives in one person's head.
                <br />
                <strong>When they leave, it leaves with them.</strong>
              </p>
            </div>
            <div className="bento-viz">
              {/* Person with knowledge radiating out */}
              <div className="bento-tribal-viz">
                <div className="bento-tribal-person">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1" width="40" height="40" opacity="0.6">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="bento-tribal-bubbles">
                  <span style={{ animationDelay: '0s' }}>OrderService</span>
                  <span style={{ animationDelay: '0.6s' }}>OrderCreated</span>
                  <span style={{ animationDelay: '1.2s' }}>PaymentAPI</span>
                  <span style={{ animationDelay: '1.8s' }}>kafka.orders</span>
                  <span style={{ animationDelay: '2.4s' }}>ShipmentFlow</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: 3 regular cards */}
          <div className="bento-card">
            <div className="bento-text">
              <div className="bento-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" width="20" height="20">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Slow onboarding</span>
              </div>
              <p>
                New engineers spend days asking around.
                <br />
                <strong>"Who owns this event? Where does it go?"</strong>
              </p>
            </div>
            <div className="bento-viz">
              <div className="bento-onboarding-viz">
                <div className="bento-chat-bubble bento-chat-q">Who owns OrderCreated?</div>
                <div className="bento-chat-bubble bento-chat-a">Maybe the orders team?</div>
                <div className="bento-chat-bubble bento-chat-q">Where does it publish to?</div>
                <div className="bento-chat-bubble bento-chat-a">Check with Sarah</div>
                <div className="bento-chat-bubble bento-chat-q">Is this still in use?</div>
                <div className="bento-chat-bubble bento-chat-a">No idea</div>
              </div>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-text">
              <div className="bento-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="1.5" width="20" height="20">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>No source of truth</span>
              </div>
              <p>
                Wiki, Confluence, Notion, Slack threads.
                <br />
                <strong>Five sources. Five different answers.</strong>
              </p>
            </div>
            <div className="bento-viz">
              <div className="bento-sources-viz">
                <div className="bento-source-row">
                  <div className="bento-source-pill">Wiki</div>
                  <span className="bento-source-val">v2.1 (REST)</span>
                </div>
                <div className="bento-source-row">
                  <div className="bento-source-pill">Confluence</div>
                  <span className="bento-source-val">v1.3 (gRPC)</span>
                </div>
                <div className="bento-source-row">
                  <div className="bento-source-pill">Notion</div>
                  <span className="bento-source-val">v2.0 (Kafka)</span>
                </div>
                <div className="bento-source-row">
                  <div className="bento-source-pill">Slack</div>
                  <span className="bento-source-val">"I think it's deprecated?"</span>
                </div>
                <div className="bento-source-row">
                  <div className="bento-source-pill">README</div>
                  <span className="bento-source-val">Last updated 2023</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Full-width before/after */}
          <div className="bento-card bento-col-3">
            <div className="bento-before-after">
              <div className="bento-ba-side">
                <div className="bento-ba-label">Today</div>
                <div className="bento-ba-content">
                  <div className="bento-ba-files">
                    <code>orders-asyncapi.yml</code>
                    <code>payments-openapi.yml</code>
                    <code>inventory-asyncapi.yml</code>
                    <code>shipping-openapi.yml</code>
                  </div>
                  <span className="bento-ba-note">No view of how they connect</span>
                </div>
              </div>
              <div className="bento-ba-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                  <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
              <div className="bento-ba-side bento-ba-after">
                <div className="bento-ba-label bento-ba-label-green">With Compass</div>
                <div className="bento-ba-content">
                  <div className="bento-ba-files">
                    <code><span className="kw">import from</span> <span className="str">"./orders-asyncapi.yml"</span></code>
                    <code><span className="kw">import from</span> <span className="str">"./payments-openapi.yml"</span></code>
                    <code><span className="kw">import from</span> <span className="str">"./inventory-asyncapi.yml"</span></code>
                    <code><span className="kw">import from</span> <span className="str">"./shipping-openapi.yml"</span></code>
                  </div>
                  <span className="bento-ba-note bento-ba-note-green">Full architecture view, instantly</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="bento-statement reveal">
          <strong>Your specs already describe the pieces.</strong> Compass connects them into the full picture.
        </p>
      </section>

      <div className="divider"></div>

      {/* How It Works */}
      <section className="section" id="how">
        <div className="section-label reveal">How It Works</div>
        <h2 className="section-title reveal">Specs to architecture in three steps</h2>
        <p className="section-desc reveal">Import. Compose. Visualize.</p>
        <div className="steps stagger-children">
          <div className="step">
            <div className="step-head">
              <div className="step-num">1</div>
              <h3>Import your specs</h3>
            </div>
            <div className="step-body">
              <p>
                Import events, operations, and channels from your existing AsyncAPI and OpenAPI files. Pick specific
                resources or bring in an entire spec at once.
              </p>
              <div className="code-block">
                <pre>
                  <span className="cm">{'// Import specific resources'}</span>
                  {'\n'}
                  <span className="kw">import events</span> <span className="br">{'{'}</span>{' '}
                  <span className="ref">OrderCreated</span>, <span className="ref">OrderShipped</span>{' '}
                  <span className="br">{'}'}</span> <span className="kw">from</span>{' '}
                  <span className="str">"./asyncapi.yml"</span>
                  {'\n'}
                  <span className="kw">import operations</span> <span className="br">{'{'}</span>{' '}
                  <span className="ref">CreateOrder</span> <span className="br">{'}'}</span>{' '}
                  <span className="kw">from</span> <span className="str">"./openapi.yml"</span>
                  {'\n\n'}
                  <span className="cm">{'// Or import everything'}</span>
                  {'\n'}
                  <span className="kw">import from</span> <span className="str">"./orders-asyncapi.yml"</span>
                </pre>
              </div>
            </div>
          </div>
          <div className="step">
            <div className="step-head">
              <div className="step-num">2</div>
              <h3>Compose the architecture</h3>
            </div>
            <div className="step-body">
              <p>Add domains, ownership, and the context that specs alone can't capture.</p>
              <div className="code-block">
                <pre>
                  <span className="cm">{'// Group services into a business domain'}</span>
                  {'\n'}
                  <span className="kw">domain</span> <span className="fn">OrderManagement</span>{' '}
                  <span className="br">{'{'}</span>
                  {'\n'}
                  {'  '}
                  <span className="kw">version</span> <span className="str">1.0.0</span>
                  {'\n\n'}
                  {'  '}
                  <span className="cm">{'// Assign ownership and wire up messaging'}</span>
                  {'\n'}
                  {'  '}
                  <span className="kw">service</span> <span className="fn">OrderService</span>{' '}
                  <span className="br">{'{'}</span>
                  {'\n'}
                  {'    '}
                  <span className="kw">owners</span> <span className="ref">@order-team</span>
                  {'\n'}
                  {'    '}
                  <span className="kw">sends event</span> <span className="ref">OrderCreated</span>{' '}
                  <span className="kw">to</span> <span className="ref">OrderStream</span>
                  {'\n'}
                  {'  '}
                  <span className="br">{'}'}</span>
                  {'\n\n'}
                  {'  '}
                  <span className="cm">{'// Define consumers — Compass maps the dependency'}</span>
                  {'\n'}
                  {'  '}
                  <span className="kw">service</span> <span className="fn">PaymentService</span>{' '}
                  <span className="br">{'{'}</span>
                  {'\n'}
                  {'    '}
                  <span className="kw">receives event</span> <span className="ref">OrderCreated</span>{' '}
                  <span className="kw">from</span> <span className="ref">OrderStream</span>
                  {'\n'}
                  {'  '}
                  <span className="br">{'}'}</span>
                  {'\n'}
                  <span className="br">{'}'}</span>
                </pre>
              </div>
            </div>
          </div>
          <div className="step">
            <div className="step-head">
              <div className="step-num">3</div>
              <h3>Visualize and share</h3>
            </div>
            <div className="step-body">
              <p>
                Your architecture renders as you type. Share a link so everyone sees the same picture. When
                you're ready, export to EventCatalog for full documentation.
              </p>
              <StepVisualizer />
            </div>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* Sources */}
      <section className="section section-center">
        <div className="section-label reveal">Import From Anywhere</div>
        <h2 className="section-title reveal">Your specs. One architecture.</h2>
        <p className="section-desc reveal">Start with local files today. Connect to registries as your needs grow.</p>
        <div className="sources-grid stagger-children">
          <div className="source-card">
            <div className="source-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5">
                <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                <path d="M9 13h6m-6 3h4" />
              </svg>
            </div>
            <h4>AsyncAPI</h4>
            <span className="source-detail">Events, channels</span>
          </div>
          <div className="source-card">
            <div className="source-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5">
                <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                <path d="M10 12l2 2 4-4" />
              </svg>
            </div>
            <h4>OpenAPI</h4>
            <span className="source-detail">Operations, endpoints</span>
          </div>
          <div className="source-card soon">
            <div className="source-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h4>Confluent</h4>
            <span className="source-detail">Schema Registry</span>
          </div>
          <div className="source-card soon">
            <div className="source-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <h4>AWS</h4>
            <span className="source-detail">EventBridge, Glue</span>
          </div>
          <div className="source-card soon">
            <div className="source-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
              </svg>
            </div>
            <h4>Solace</h4>
            <span className="source-detail">Queues, topics</span>
          </div>
          <div className="source-card soon">
            <div className="source-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h4>GitHub</h4>
            <span className="source-detail">Private repos</span>
          </div>
          <div className="source-card soon">
            <div className="source-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h4>Apicurio</h4>
            <span className="source-detail">Schema Registry</span>
          </div>
          <div className="source-card soon">
            <div className="source-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <h4>Azure</h4>
            <span className="source-detail">Schema Registry</span>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* Use Cases */}
      <section className="section section-center" id="usecases">
        <div className="section-label reveal">Built For Architects</div>
        <h2 className="section-title reveal">How teams can use Compass</h2>
        <div className="usecases-grid stagger-children">
          <div className="usecase-card">
            <div className="usecase-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3>Architecture discovery</h3>
            </div>
            <p>
              Import spec files and see how services connect across your system.
              <br />
              <strong>New engineers get the full picture in minutes, not weeks.</strong>
            </p>
            <div className="usecase-viz">
              <div className="usecase-viz-inner usecase-discovery">
                <div className="uc-node uc-node-service" style={{ top: '20%', left: '50%', transform: 'translateX(-50%)' }}>OrderService</div>
                <div className="uc-node uc-node-event" style={{ bottom: '20%', left: '15%' }}>OrderCreated</div>
                <div className="uc-node uc-node-event" style={{ bottom: '20%', right: '15%' }}>PaymentProcessed</div>
                <svg className="uc-lines" viewBox="0 0 300 120" preserveAspectRatio="none">
                  <line x1="150" y1="35" x2="65" y2="85" stroke="var(--cyan)" strokeWidth="1" opacity="0.3" />
                  <line x1="150" y1="35" x2="235" y2="85" stroke="var(--cyan)" strokeWidth="1" opacity="0.3" />
                </svg>
              </div>
            </div>
          </div>
          <div className="usecase-card">
            <div className="usecase-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <h3>Design and planning</h3>
            </div>
            <p>
              Import current state from specs, sketch proposed changes inline.
              <br />
              <strong>Compare before and after in one view.</strong>
            </p>
            <div className="usecase-viz">
              <div className="usecase-viz-inner usecase-design">
                <div className="uc-design-col">
                  <span className="uc-design-label">Before</span>
                  <div className="uc-design-block"></div>
                  <div className="uc-design-block"></div>
                </div>
                <div className="uc-design-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                    <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
                <div className="uc-design-col">
                  <span className="uc-design-label uc-design-label-new">After</span>
                  <div className="uc-design-block uc-design-block-new"></div>
                  <div className="uc-design-block uc-design-block-new"></div>
                  <div className="uc-design-block uc-design-block-added"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="usecase-card">
            <div className="usecase-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3>Impact analysis</h3>
            </div>
            <p>
              Deprecating an event? Import your specs and see every service that depends on it.
              <br />
              <strong>No more chasing down five different teams.</strong>
            </p>
            <div className="usecase-viz">
              <div className="usecase-viz-inner usecase-impact">
                <svg className="uc-impact-svg" viewBox="0 0 280 140">
                  {/* Lines from center to deps */}
                  <line className="uc-impact-line" x1="140" y1="70" x2="40" y2="25" />
                  <line className="uc-impact-line" x1="140" y1="70" x2="240" y2="25" />
                  <line className="uc-impact-line" x1="140" y1="70" x2="50" y2="118" />
                  <line className="uc-impact-line" x1="140" y1="70" x2="230" y2="118" />
                  {/* Center node */}
                  <rect x="90" y="55" width="100" height="30" rx="6" className="uc-impact-center-bg" />
                  <text x="140" y="74" textAnchor="middle" className="uc-impact-center-text">OrderCreated</text>
                  {/* Dep nodes */}
                  <rect x="2" y="12" width="76" height="26" rx="4" className="uc-impact-dep-bg" />
                  <text x="40" y="29" textAnchor="middle" className="uc-impact-dep-text">Payments</text>
                  <rect x="202" y="12" width="76" height="26" rx="4" className="uc-impact-dep-bg" />
                  <text x="240" y="29" textAnchor="middle" className="uc-impact-dep-text">Shipping</text>
                  <rect x="2" y="105" width="96" height="26" rx="4" className="uc-impact-dep-bg" />
                  <text x="50" y="122" textAnchor="middle" className="uc-impact-dep-text">Notifications</text>
                  <rect x="182" y="105" width="96" height="26" rx="4" className="uc-impact-dep-bg" />
                  <text x="230" y="122" textAnchor="middle" className="uc-impact-dep-text">Analytics</text>
                </svg>
              </div>
            </div>
          </div>
          <div className="usecase-card">
            <div className="usecase-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3>AI-ready architecture</h3>
            </div>
            <p>
              Export to EventCatalog and use the MCP server to let AI agents query your architecture.
              <br />
              <strong>Ask questions, trace dependencies, and evolve your system with AI.</strong>
            </p>
            <div className="usecase-viz">
              <div className="usecase-viz-inner usecase-ai">
                <div className="uc-ai-prompt">
                  <span className="uc-ai-caret">&gt;</span> Which services depend on OrderCreated?
                </div>
                <div className="uc-ai-response">
                  <span>PaymentService, ShippingService, NotificationService</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider"></div>

      {/* CTA */}
      <section className="cta-hero">
        <h2 className="cta-hero-title reveal">See your architecture in 30 seconds</h2>
        <p className="cta-hero-desc reveal">No signup. No install. Just paste a spec and see it come to life.</p>
        <div className="cta-hero-actions reveal">
          <a href="/playground" className="btn-primary btn-lg" onClick={openPlayground}>
            Open Playground &rarr;
          </a>
          <a href="https://eventcatalog.dev/docs" className="btn-ghost btn-lg">
            Read the docs
          </a>
        </div>
        <p className="cta-hero-note reveal">Free forever &middot; No account required &middot; Exports to EventCatalog</p>
      </section>

      {/* Footer */}
      <footer className="reveal">
        <span className="footer-brand">
          EventCatalog Compass &middot; Built by{' '}
          <a href="https://twitter.com/boyney123">David Boyne</a>
        </span>
        <div className="footer-links">
          <a href="https://eventcatalog.dev">EventCatalog</a>
          <a href="https://github.com/event-catalog">GitHub</a>
          <a href="https://discord.gg/3rjaZMmrAm">Discord</a>
          <a href="https://twitter.com/event_catalog">Twitter</a>
        </div>
      </footer>
    </div>
  );
}

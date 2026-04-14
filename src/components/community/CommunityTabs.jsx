function CommunityTabs({ tabs = [], activeTab, onChange }) {
  return (
    <section className="main-card">
      <div className="community-tab-list">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </section>
  )
}

export default CommunityTabs

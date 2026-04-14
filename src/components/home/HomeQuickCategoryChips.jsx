function HomeQuickCategoryChips({ categories = [], onSelectCategory }) {
  return (
    <div className="home-quick-chips">
      {categories.map((item) => (
        <button key={item} type="button" onClick={() => onSelectCategory(item)}>
          {item}
        </button>
      ))}
    </div>
  )
}

export default HomeQuickCategoryChips

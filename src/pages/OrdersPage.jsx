import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import SectionTitle from '../components/SectionTitle'
import StatusBadge from '../components/StatusBadge'
import { mockOrders } from '../data/mockOrders'

function OrdersPage() {
  const tabs = ['전체', '요청', '수락됨', '진행중', '완료', '취소']
  const [activeTab, setActiveTab] = useState('전체')

  const filteredOrders = useMemo(() => {
    if (activeTab === '전체') return mockOrders
    if (activeTab === '수락됨') {
      return mockOrders.filter((order) =>
        ['수락됨', '진행중'].includes(order.status),
      )
    }
    return mockOrders.filter(
      (order) => order.status === activeTab || order.type === activeTab,
    )
  }, [activeTab])

  return (
    <div className="page-stack">
      <section className="main-card hero-card">
        <p className="badge">주문내역</p>
        <h1>주문내역</h1>
        <p>진행 중인 요청과 완료된 작업을 한 번에 확인합니다.</p>
      </section>

      <section className="main-card orders-tab-card">
        <SectionTitle title="상태 필터" />
        <div className="orders-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? 'active' : ''}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      <section className="orders-list">
        {filteredOrders.length === 0 ? (
          <EmptyState
            title="주문 내역이 없습니다"
            description="해당 상태의 주문이 아직 없어요. 다른 탭을 확인해보세요."
          />
        ) : (
          filteredOrders.map((order) => (
            <article key={order.id} className="main-card order-card">
              <div className="order-card-top">
                <div>
                  <h3>{order.serviceName}</h3>
                  <p>{order.sellerName}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="order-meta-grid">
                <span>옵션 {order.option}</span>
                <span>주문일 {order.orderedAt}</span>
                <span>사용 포인트 {order.pointsUsed.toLocaleString()}P</span>
                <span>주문번호 {order.id}</span>
              </div>

              <Link className="order-detail-link" to={`/seller/${order.sellerId}`}>
                상세 보기
              </Link>
            </article>
          ))
        )}
      </section>
    </div>
  )
}

export default OrdersPage

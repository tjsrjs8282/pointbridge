import SecondaryButton from '../SecondaryButton'

function SellerProfileVisitorActions({ onStartChat }) {
  return (
    <div className="seller-profile-actions">
      <SecondaryButton onClick={onStartChat}>채팅신청</SecondaryButton>
    </div>
  )
}

export default SellerProfileVisitorActions

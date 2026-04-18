import PrimaryButton from '../PrimaryButton'
import SecondaryButton from '../SecondaryButton'

function SellerProfileOwnerActions({ onEditProfile, onDeleteProfile, isDeletingSellerProfile }) {
  return (
    <div className="seller-profile-actions">
      <PrimaryButton onClick={onEditProfile}>판매자 대시보드</PrimaryButton>
      <SecondaryButton className="seller-delete-btn" onClick={onDeleteProfile} disabled={isDeletingSellerProfile}>
        {isDeletingSellerProfile ? '삭제 중...' : '판매자 프로필 삭제'}
      </SecondaryButton>
    </div>
  )
}

export default SellerProfileOwnerActions

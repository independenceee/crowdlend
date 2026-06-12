use cardano/address.{Address, VerificationKey}
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use cardano/tx.{verify_signature}

validator identity(issuer: Address) {
  mint(_redeemer: Void, _policy_id: PolicyId, transaction: Transaction) {
    let Transaction { extra_signatories, .. } = transaction
    expect VerificationKey(issuer_pkh) = issuer.payment_credential
    verify_signature(extra_signatories, issuer_pkh)
  }

  else(_) {
    fail
  }
}

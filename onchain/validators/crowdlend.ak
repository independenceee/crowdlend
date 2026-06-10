use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/interval.{Finite}
use cardano/assets.{
  AssetName, PolicyId, Value, flatten, from_asset, from_lovelace, merge,
  quantity_of, without_lovelace,
}
use cardano/transaction.{
  InlineDatum, Output, OutputReference, Transaction, find_input,
}
use cardano/tx.{verify_signature}
use types.{
  Active, Cancel, Datum, Fund, Liquidate, Pending, Redeemer, Repay, Status,
}
use cardano/address.{VerificationKey}
use validation/find.{output_by_addr, output_by_addr_value}

validator crowdlend {
  spend(
    datum_option: Option<Datum>,
    redeemer: Redeemer,
    output_reference: OutputReference,
    transaction: Transaction,
  ) {
    expect Some(datum_input) = datum_option
    let Transaction { outputs, inputs, validity_range, extra_signatories, .. } = transaction
    expect Some(input) = find_input(inputs, output_reference)
    let script_address = input.output.address
    let token = input.output.value
      |> without_lovelace()

    when redeemer is {
      Fund -> {
        expect Pending = datum_input.status

        let output = output_by_addr_value(outputs, script_address, token)
        expect InlineDatum(datum_output_raw) = output.datum
        expect datum_output: Datum = datum_output_raw
        expect Some(lender_address) = datum_output.lender
        expect VerificationKey(lender_pkh) = lender_address.payment_credential
        expect Finite(current_time) = validity_range.lower_bound.bound_type
        let expected_due_date = current_time + datum_input.loan_duration

        let min_locked = merge(
          from_lovelace(datum_input.principal),
          from_asset(
            datum_input.collateral_policy_id,
            datum_input.collateral_asset_name,
            1,
          ),
        )

        let flat_min = flatten(min_locked)
        let value_has_at_least = list.all(
          flat_min,
          fn(item) {
            let (policy_id, asset_name, min_qty) = item
            quantity_of(output.value, policy_id, asset_name) >= min_qty
          },
        )
        and {
          verify_signature(extra_signatories, lender_pkh),
          datum_output.status == Active { funded_at: current_time },
          datum_output.due_date == Some(expected_due_date),
          datum_output.lender == Some(lender_address),
          datum_output.borrower == datum_input.borrower,
          datum_output.principal == datum_input.principal,
          datum_output.interest_rate == datum_input.interest_rate,
          datum_output.collateral_policy_id == datum_input.collateral_policy_id,
          datum_output.collateral_asset_name == datum_input.collateral_asset_name,
          value_has_at_least,
        }
      }
      Repay -> True
      Cancel -> True
      Liquidate -> True
    }
  }

  else(_) {
    fail
  }
}

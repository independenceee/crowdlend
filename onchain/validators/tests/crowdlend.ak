use cardano/address.{Address}
use cardano/assets.{AssetName, PolicyId, add, from_asset, from_lovelace}
use cardano/transaction.{InlineDatum, Input, OutputReference, Transaction}
use crowdlend
use mocktail.{
  add_input, complete, invalid_before, invalid_hereafter, mock_policy_id,
  mock_pub_key_address, mock_pub_key_hash, mock_script_address,
  mock_script_output, mock_utxo_ref, mocktail_tx, required_signer_hash, tx_out,
  tx_out_inline_datum,
}
use types.{
  Active, Cancel, Datum, Fund, Liquidate, Pending, Redeemer, Repay, Status,
}

test fund_success_with_exact_principal_and_collateral_locked() {
  // =========================================================================
  // TEST SCENARIO: Lender successfully funds a pending loan request.
  //
  // GIVEN (Context):
  //   - A loan request is currently in 'Pending' status (no lender assigned).
  //   - The request currently locks exactly 1 Collateral NFT at the Script address.
  //   - The required loan amount (Principal) is set to 1000 ADA.
  //
  // WHEN (Action):
  //   - The transaction is executed at slot time 500.
  //   - The transaction is signed with a valid signature from the Lender ('#"llll"').
  //   - The script output receives exactly 1000 ADA (principal) + retains the Collateral NFT.
  //   - The output datum updates the status to 'Active' with 'funded_at = 500',
  //     and 'due_date' is dynamically computed as 1500 (500 + loan_duration 1000).
  //
  // THEN (Expected Result):
  //   - The 'crowdlend' validator validates and approves the transaction (returns true).
  // =========================================================================
  let redeemer: Redeemer = Fund

  let borrower: Address = mock_pub_key_address(0, None)
  let lender: Address = mock_pub_key_address(1, None)
  let principal: Int = 1_000_000_000
  let loan_duration: Int = 1000
  let policy_id: PolicyId = mock_policy_id(0)
  let asset_name: AssetName = "Hydra Course 2026"

  let script_address: Address = mock_script_address(0, None)
  let output_reference: OutputReference = mock_utxo_ref(0, 0)

  let datum_input = Datum {
    borrower,
    lender: None,
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: None,
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Pending,
  }

  let current_time = 500
  let expected_due = current_time + loan_duration
  let datum_output = Datum {
    borrower,
    lender: Some(lender),
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: Some(expected_due),
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Active { funded_at: current_time },
  }

  let tx: Transaction = mocktail_tx()
    |> tx_out(
        True,
        script_address,
        from_asset(policy_id, asset_name, 1)
          |> add("", "", principal),
      )
    |> tx_out_inline_datum(True, datum_output)
    |> required_signer_hash(True, mock_pub_key_hash(1))
    |> invalid_before(True, current_time)
    |> invalid_hereafter(True, current_time + 10)
    |> complete()
    |> add_input(
        True,
        Input {
          output_reference,
          output: mock_script_output(
            script_address,
            from_asset(policy_id, asset_name, 1)
              |> add("", "", principal),
            InlineDatum(Some(datum_input)),
          ),
        },
      )

  crowdlend.crowdlend.spend(Some(datum_input), redeemer, output_reference, tx)
}

test fund_success_calculates_correct_due_date() {
  // =========================================================================
  // TEST SCENARIO: Verification of precise 'due_date' computation during funding.
  // GIVEN: A pending loan with a predefined duration of 1000 slots.
  // WHEN: The loan is funded exactly at slot 500 (current_time).
  // THEN: The transaction must pass because the output datum specifies 
  //       the exact mathematical timeline: due_date = 500 + 1000 = 1500.
  // =========================================================================
  let redeemer: Redeemer = Fund

  let borrower: Address = mock_pub_key_address(0, None)
  let lender: Address = mock_pub_key_address(1, None)
  let principal: Int = 1_000_000_000
  let loan_duration: Int = 1000
  // Hạn vay: 1000 slots
  let policy_id: PolicyId = mock_policy_id(0)
  let asset_name: AssetName = "Hydra Course 2026"

  let script_address: Address = mock_script_address(0, None)
  let output_reference: OutputReference = mock_utxo_ref(0, 0)

  let datum_input = Datum {
    borrower,
    lender: None,
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: None,
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Pending,
  }

  let current_time = 500
  let expected_due = current_time + loan_duration

  let datum_output = Datum {
    borrower,
    lender: Some(lender),
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: Some(expected_due),
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Active { funded_at: current_time },
  }

  let tx: Transaction = mocktail_tx()
    |> tx_out(
        True,
        script_address,
        from_asset(policy_id, asset_name, 1)
          |> add("", "", principal),
      )
    |> tx_out_inline_datum(True, datum_output)
    |> required_signer_hash(True, mock_pub_key_hash(1))
    |> invalid_before(True, current_time)
    |> invalid_hereafter(True, current_time + 10)
    |> complete()
    |> add_input(
        True,
        Input {
          output_reference,
          output: mock_script_output(
            script_address,
            from_asset(policy_id, asset_name, 1)
              |> add("", "", principal),
            InlineDatum(Some(datum_input)),
          ),
        },
      )

  crowdlend.crowdlend.spend(Some(datum_input), redeemer, output_reference, tx)
}

test fund_fail_if_loan_status_is_already_active() {
  // =========================================================================
  // TEST SCENARIO: Funding must fail if the loan is already in Active status.
  //
  // GIVEN (Context):
  //   - A loan request UTxO that has ALREADY been funded by an earlier lender.
  //   - The input datum's status is already set to 'Active' with a 'funded_at' timestamp.
  //
  // WHEN (Action):
  //   - A malicious actor or another lender tries to invoke the 'Fund' redeemer 
  //     on this already active UTxO at slot 600.
  //
  // THEN (Expected Result):
  //   - The validator must reject the transaction to prevent overriding terms 
  //     or double-funding (returns false).
  // =========================================================================
  let redeemer: Redeemer = Fund

  let borrower: Address = mock_pub_key_address(0, None)
  let initial_lender: Address = mock_pub_key_address(1, None)
  let second_lender: Address = mock_pub_key_address(2, None)
  let principal: Int = 1_000_000_000
  let loan_duration: Int = 1000
  let policy_id: PolicyId = mock_policy_id(0)
  let asset_name: AssetName = "Hydra Course 2026"

  let script_address: Address = mock_script_address(0, None)
  let output_reference: OutputReference = mock_utxo_ref(0, 0)

  let original_funding_time = 500
  let original_expected_due = original_funding_time + loan_duration

  let datum_input = Datum {
    borrower,
    lender: Some(initial_lender),
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: Some(original_expected_due),
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Active { funded_at: original_funding_time },
  }

  let attack_time = 600
  let new_expected_due = attack_time + loan_duration
  let datum_output = Datum {
    borrower,
    lender: Some(second_lender),
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: Some(new_expected_due),
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Active { funded_at: attack_time },
  }

  let tx: Transaction = mocktail_tx()
    |> tx_out(
        True,
        script_address,
        from_asset(policy_id, asset_name, 1)
          |> add("", "", principal),
      )
    |> tx_out_inline_datum(True, datum_output)
    |> required_signer_hash(True, mock_pub_key_hash(2))
    |> invalid_before(True, attack_time)
    |> invalid_hereafter(True, attack_time + 10)
    |> complete()
    |> add_input(
        True,
        Input {
          output_reference,
          output: mock_script_output(
            script_address,
            from_asset(policy_id, asset_name, 1)
              |> add("", "", principal),
            InlineDatum(Some(datum_input)),
          ),
        },
      )

  !crowdlend.crowdlend.spend(Some(datum_input), redeemer, output_reference, tx)
}

test fund_fail_if_missing_lender_signature() {
  // =========================================================================
  // TEST SCENARIO: Funding must fail if the Lender's signature is missing.
  //
  // GIVEN (Context):
  //   - A valid pending loan request waiting to be funded.
  //   - Correct script output containing the exact principal ADA and collateral.
  //
  // WHEN (Action):
  //   - A transaction attempts to execute the 'Fund' redeemer but completely
  //     omits the required lender's signature verification key hash.
  //
  // THEN (Expected Result):
  //   - The validator must immediately crash/exit prematurely due to the 
  //     failed 'verify_signature' assertion (marked with @must_fail to PASS).
  // =========================================================================
  let redeemer: Redeemer = Fund

  let borrower: Address = mock_pub_key_address(0, None)
  let lender: Address = mock_pub_key_address(1, None)
  let principal: Int = 1_000_000_000
  let loan_duration: Int = 1000
  let policy_id: PolicyId = mock_policy_id(0)
  let asset_name: AssetName = "Hydra Course 2026"

  let script_address: Address = mock_script_address(0, None)
  let output_reference: OutputReference = mock_utxo_ref(0, 0)

  let datum_input = Datum {
    borrower,
    lender: None,
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: None,
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Pending,
  }

  let current_time = 500
  let expected_due = current_time + loan_duration
  let datum_output = Datum {
    borrower,
    lender: Some(lender),
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: Some(expected_due),
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Active { funded_at: current_time },
  }

  let tx: Transaction = mocktail_tx()
    |> tx_out(
        True,
        script_address,
        from_asset(policy_id, asset_name, 1)
          |> add("", "", principal),
      )
    |> tx_out_inline_datum(True, datum_output)
    // |> required_signer_hash(True, mock_pub_key_hash(1))
    |> invalid_before(True, current_time)
    |> invalid_hereafter(True, current_time + 10)
    |> complete()
    |> add_input(
        True,
        Input {
          output_reference,
          output: mock_script_output(
            script_address,
            from_asset(policy_id, asset_name, 1)
              |> add("", "", principal),
            InlineDatum(Some(datum_input)),
          ),
        },
      )

  !crowdlend.crowdlend.spend(Some(datum_input), redeemer, output_reference, tx)
}

test fund_fail_if_output_lovelace_is_less_than_principal() {
  // =========================================================================
  // TEST SCENARIO: Funding must fail if the ADA locked in the output script 
  //                is less than the demanded principal.
  //
  // GIVEN (Context):
  //   - A pending loan request demanding a principal of 1,000,000,000 Lovelaces (1000 ADA).
  //
  // WHEN (Action):
  //   - A lender tries to execute the 'Fund' redeemer but only deposits 
  //     500,000,000 Lovelaces (500 ADA) into the resulting script output.
  //
  // THEN (Expected Result):
  //   - The validator must catch the financial deficit and crash the transaction 
  //     (marked with @must_fail to PASS).
  // =========================================================================
  let redeemer: Redeemer = Fund

  let borrower: Address = mock_pub_key_address(0, None)
  let lender: Address = mock_pub_key_address(1, None)
  let principal: Int = 1_000_000_000
  let loan_duration: Int = 1000
  let policy_id: PolicyId = mock_policy_id(0)
  let asset_name: AssetName = "Hydra Course 2026"

  let script_address: Address = mock_script_address(0, None)
  let output_reference: OutputReference = mock_utxo_ref(0, 0)

  let datum_input = Datum {
    borrower,
    lender: None,
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: None,
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Pending,
  }

  let current_time = 500
  let expected_due = current_time + loan_duration
  let datum_output = Datum {
    borrower,
    lender: Some(lender),
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: Some(expected_due),
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Active { funded_at: current_time },
  }

  let malicious_short_principal = 500_000_000

  let tx: Transaction = mocktail_tx()
    |> tx_out(
        True,
        script_address,
        from_asset(policy_id, asset_name, 1)
          |> add("", "", malicious_short_principal),
      )
    |> tx_out_inline_datum(True, datum_output)
    |> required_signer_hash(True, mock_pub_key_hash(1))
    |> invalid_before(True, current_time)
    |> invalid_hereafter(True, current_time + 10)
    |> complete()
    |> add_input(
        True,
        Input {
          output_reference,
          output: mock_script_output(
            script_address,
            from_asset(policy_id, asset_name, 1)
              |> add("", "", principal),
            InlineDatum(Some(datum_input)),
          ),
        },
      )

  !crowdlend.crowdlend.spend(Some(datum_input), redeemer, output_reference, tx)
}

test fund_fail_if_collateral_token_is_missing_or_wrong_quantity() {
  // =========================================================================
  // TEST SCENARIO: Funding must fail if the collateral asset is missing 
  //                or has an incorrect quantity in the output script UTxO.
  //
  // GIVEN (Context):
  //   - A pending loan request that locks exactly 1 Collateral NFT ("Hydra Course 2026").
  //
  // WHEN (Action):
  //   - A lender deposits the correct 1,000,000,000 Lovelaces (1000 ADA) principal,
  //     but intentionally alters the collateral token quantity to 0 (omits it) 
  //     in the continuing script output.
  //
  // THEN (Expected Result):
  //   - The validator's asset matching logic (`value_has_at_least`) resolves to false,
  //     causing the contract to crash and reject the exploit (marked with @must_fail to PASS).
  // =========================================================================
  let redeemer: Redeemer = Fund

  let borrower: Address = mock_pub_key_address(0, None)
  let lender: Address = mock_pub_key_address(1, None)
  let principal: Int = 1_000_000_000
  let loan_duration: Int = 1000
  let policy_id: PolicyId = mock_policy_id(0)
  let asset_name: AssetName = "Hydra Course 2026"

  let script_address: Address = mock_script_address(0, None)
  let output_reference: OutputReference = mock_utxo_ref(0, 0)

  let datum_input = Datum {
    borrower,
    lender: None,
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: None,
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Pending,
  }

  let current_time = 500
  let expected_due = current_time + loan_duration
  let datum_output = Datum {
    borrower,
    lender: Some(lender),
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: Some(expected_due),
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Active { funded_at: current_time },
  }

  let malicious_output_value = from_lovelace(principal)

  let tx: Transaction = mocktail_tx()
    |> tx_out(True, script_address, malicious_output_value)
    |> tx_out_inline_datum(True, datum_output)
    |> required_signer_hash(True, mock_pub_key_hash(1))
    |> invalid_before(True, current_time)
    |> invalid_hereafter(True, current_time + 10)
    |> complete()
    |> add_input(
        True,
        Input {
          output_reference,
          output: mock_script_output(
            script_address,
            from_asset(policy_id, asset_name, 1) |> add("", "", principal),
            InlineDatum(Some(datum_input)),
          ),
        },
      )

  !crowdlend.crowdlend.spend(Some(datum_input), redeemer, output_reference, tx)
}

test fund_fail_if_loan_terms_altered_in_output_datum() {
  // =========================================================================
  // TEST SCENARIO: Funding must fail if the lender attempts to modify core
  //                loan terms (like interest rate) inside the output datum.
  //
  // GIVEN (Context):
  //   - A pending loan request specifying an agreement of a 10% interest rate.
  //
  // WHEN (Action):
  //   - A lender resolves the 'Fund' redeemer but crafts a malicious output
  //     datum modifying the 'interest_rate' field to 50%.
  //
  // THEN (Expected Result):
  //   - The validator detects that the output contract parameters do not match
  //     the input criteria, forcing an immediate panic (marked with @must_fail to PASS).
  // =========================================================================
  let redeemer: Redeemer = Fund

  let borrower: Address = mock_pub_key_address(0, None)
  let lender: Address = mock_pub_key_address(1, None)
  let principal: Int = 1_000_000_000
  let loan_duration: Int = 1000
  let policy_id: PolicyId = mock_policy_id(0)
  let asset_name: AssetName = "Hydra Course 2026"

  let script_address: Address = mock_script_address(0, None)
  let output_reference: OutputReference = mock_utxo_ref(0, 0)

  let datum_input = Datum {
    borrower,
    lender: None,
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: None,
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Pending,
  }

  let current_time = 500
  let expected_due = current_time + loan_duration

  let datum_output = Datum {
    borrower,
    lender: Some(lender),
    principal,
    interest_rate: 50,
    loan_duration,
    due_duration: 200,
    due_date: Some(expected_due),
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Active { funded_at: current_time },
  }

  let tx: Transaction = mocktail_tx()
    |> tx_out(
        True,
        script_address,
        from_asset(policy_id, asset_name, 1)
          |> add("", "", principal),
      )
    |> tx_out_inline_datum(True, datum_output)
    |> required_signer_hash(True, mock_pub_key_hash(1))
    |> invalid_before(True, current_time)
    |> invalid_hereafter(True, current_time + 10)
    |> complete()
    |> add_input(
        True,
        Input {
          output_reference,
          output: mock_script_output(
            script_address,
            from_asset(policy_id, asset_name, 1)
              |> add("", "", principal),
            InlineDatum(Some(datum_input)),
          ),
        },
      )

  !crowdlend.crowdlend.spend(Some(datum_input), redeemer, output_reference, tx)
}

test fund_fail_if_validity_range_has_no_lower_bound() {
  // =========================================================================
  // TEST SCENARIO: Funding must fail if the transaction validity range
  //                lacks a finite lower bound.
  //
  // GIVEN (Context):
  //   - A standard pending loan request with a 1000-slot duration.
  //
  // WHEN (Action):
  //   - A lender attempts to fund the loan, but submits a transaction where
  //     the lower bound of the validity range is completely missing 
  //     (omitting the 'invalid_before' parameter).
  //
  // THEN (Expected Result):
  //   - The validator cannot identify a valid starting slot to calculate
  //     the 'due_date', triggering a strict assertion panic (marked with @must_fail to PASS).
  // =========================================================================
  let redeemer: Redeemer = Fund

  let borrower: Address = mock_pub_key_address(0, None)
  let lender: Address = mock_pub_key_address(1, None)
  let principal: Int = 1_000_000_000
  let loan_duration: Int = 1000
  let policy_id: PolicyId = mock_policy_id(0)
  let asset_name: AssetName = "Hydra Course 2026"

  let script_address: Address = mock_script_address(0, None)
  let output_reference: OutputReference = mock_utxo_ref(0, 0)

  let datum_input = Datum {
    borrower,
    lender: None,
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: None,
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Pending,
  }

  let current_time = 500
  let expected_due = current_time + loan_duration
  let datum_output = Datum {
    borrower,
    lender: Some(lender),
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: Some(expected_due),
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Active { funded_at: current_time },
  }

  let tx: Transaction = mocktail_tx()
    |> tx_out(
        True,
        script_address,
        from_asset(policy_id, asset_name, 1)
          |> add("", "", principal),
      )
    |> tx_out_inline_datum(True, datum_output)
    |> required_signer_hash(True, mock_pub_key_hash(1))
    // |> invalid_before(True, current_time) 
    |> invalid_hereafter(True, current_time + 10)
    |> complete()
    |> add_input(
        True,
        Input {
          output_reference,
          output: mock_script_output(
            script_address,
            from_asset(policy_id, asset_name, 1)
              |> add("", "", principal),
            InlineDatum(Some(datum_input)),
          ),
        },
      )
  !crowdlend.crowdlend.spend(Some(datum_input), redeemer, output_reference, tx)
}

test fund_fail_multi_input_exploit_attempt() {
  // =========================================================================
  // TEST SCENARIO: Funding must fail if an attacker attempts to process multi-input 
  //                script UTxOs to siphon or underfund the principal requirements.
  //
  // GIVEN (Context):
  //   - Two independent, distinct pending loan requests at the script.
  //   - Each loan demands a separate principal of 1,000,000,000 Lovelaces (1000 ADA).
  //
  // WHEN (Action):
  //   - A malicious lender batches BOTH pending inputs into a single transaction,
  //     but deliberately produces only ONE valid continuing script output containing
  //     1000 ADA + 1 Collateral NFT. 
  //   - The second input is left completely unbacked by any matching active output.
  //
  // THEN (Expected Result):
  //   - The contract's multi-input/output balancing check triggers a failure,
  //     stopping the attack and crashing the transaction (marked with @must_fail to PASS).
  // =========================================================================
  let redeemer: Redeemer = Fund

  let borrower: Address = mock_pub_key_address(0, None)
  let lender: Address = mock_pub_key_address(1, None)
  let principal: Int = 1_000_000_000
  let loan_duration: Int = 1000
  let policy_id: PolicyId = mock_policy_id(0)
  let asset_name: AssetName = "Hydra Course 2026"

  let script_address: Address = mock_script_address(0, None)
  let output_reference_1: OutputReference = mock_utxo_ref(0, 0)
  let output_reference_2: OutputReference = mock_utxo_ref(0, 1)

  let datum_input_1 = Datum {
    borrower,
    lender: None,
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: None,
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Pending,
  }
  let datum_input_2 = datum_input_1

  let current_time = 500
  let expected_due = current_time + loan_duration

  let datum_output_1 = Datum {
    borrower,
    lender: Some(lender),
    principal,
    interest_rate: 10,
    loan_duration,
    due_duration: 200,
    due_date: Some(expected_due),
    collateral_policy_id: policy_id,
    collateral_asset_name: asset_name,
    status: Active { funded_at: current_time },
  }

  let tx: Transaction = mocktail_tx()
    |> tx_out(
        True,
        script_address,
        from_asset(policy_id, asset_name, 1)
          |> add("", "", principal),
      )
    |> tx_out_inline_datum(True, datum_output_1)
    |> required_signer_hash(True, mock_pub_key_hash(1))
    |> invalid_before(True, current_time)
    |> invalid_hereafter(True, current_time + 10)
    |> complete()
    |> add_input(
        True,
        Input {
          output_reference: output_reference_1,
          output: mock_script_output(
            script_address,
            from_asset(policy_id, asset_name, 1) |> add("", "", principal),
            InlineDatum(Some(datum_input_1)),
          ),
        },
      )
    |> add_input(
        True,
        Input {
          output_reference: output_reference_2,
          output: mock_script_output(
            script_address,
            from_asset(policy_id, asset_name, 1) |> add("", "", principal),
            InlineDatum(Some(datum_input_2)),
          ),
        },
      )

  !crowdlend.crowdlend.spend(
    Some(datum_input_1),
    redeemer,
    output_reference_1,
    tx,
  )
}
// test fund_fail_if_lender_address_is_none_in_output_datum
// (Thất bại nếu trạng thái chuyển sang Active nhưng trường địa chỉ lender lại bỏ trống)

// test repay_success_before_due_date_with_full_interest
// (Trả nợ thành công trước hạn và chuyển đủ gốc + lãi cho lender)

// test repay_success_exactly_at_due_date
// (Trả nợ vẫn thành công nếu mốc thời gian giao dịch chạm đúng ngày đáo hạn)

// test repay_success_returns_exact_collateral_to_borrower
// (Trả nợ thành công và giải phóng chính xác asset thế chấp về đúng ví borrower)

// test repay_fail_if_past_due_date
// (Thất bại nếu quá hạn due_date, người vay không còn quyền tự ý trả nợ nữa)

// test repay_fail_if_amount_sent_to_lender_is_insufficient
// (Thất bại nếu số tiền chuyển cho lender thiếu dù chỉ 1 Lovelace so với gốc + lãi thực tế)

// test repay_fail_if_sent_to_wrong_lender_address
// (Thất bại nếu tiền trả nợ chuyển nhầm sang một địa chỉ ví khác chứ không phải lender ban đầu)

// test repay_fail_if_loan_was_never_funded
// (Thất bại nếu cố tình kích hoạt trả nợ cho một khoản vay vẫn đang ở trạng thái Pending)

// test repay_fail_if_script_retains_collateral
// (Thất bại nếu nợ đã trả nhưng tài sản thế chấp không được giải phóng hoàn toàn khỏi script)

// test repay_fail_if_validity_range_upper_bound_is_missing
// (Thất bại nếu thiếu mốc thời gian tối đa (upper_bound), không thể chứng minh hành động diễn ra trước hạn)

// test repay_fail_if_borrower_signature_is_missing
// (Thất bại nếu giao dịch tất toán thiếu chữ ký xác nhận của người đi vay)

// test cancel_success_when_status_is_pending_and_signed_by_borrower
// (Hủy thành công khi khoản vay đang Pending và chính chủ borrower ký lệnh)

// test cancel_success_refunds_collateral_to_borrower_completely
// (Hủy thành công và trả lại nguyên vẹn tài sản thế chấp về ví người vay)

// test cancel_fail_if_loan_is_already_active
// (Thất bại nếu khoản vay đã được giải ngân, borrower không được phép tự ý hủy để bùng nợ)

// test cancel_fail_if_missing_borrower_signature
// (Thất bại nếu lệnh hủy phát ra từ một ví lạ hoặc thiếu chữ ký của borrower)

// test cancel_fail_if_attempted_by_lender
// (Thất bại nếu người cho vay cố tình can thiệp hủy lệnh gọi vốn của người khác)

// test cancel_fail_if_utxo_is_recreated_at_script
// (Thất bại nếu giao dịch hủy nhưng UTxO không biến mất mà cố tình tạo lại tại địa chỉ contract)

// test cancel_fail_if_status_is_liquidated
// (Thất bại nếu cố tình hủy một khoản vay vốn đã bị thanh lý nợ xấu từ trước)

// test cancel_success_regardless_of_current_time_if_pending
// (Hủy thành công tại bất kỳ mốc thời gian nào, miễn là chưa có ai nạp tiền giải ngân)

// test cancel_fail_if_extra_signatories_is_empty
// (Thất bại ngay lập tức nếu mảng chứa các chữ ký của giao dịch trống rỗng)

// test cancel_fail_if_collateral_sent_to_attacker_address
// (Thất bại nếu lệnh hủy hợp lệ nhưng địa chỉ nhận tài sản thế chấp lại bị sửa sang ví hacker)

// test liquidate_success_when_past_due_date_and_signed_by_lender
// (Thanh lý thành công khi thời gian thực tế đã vượt quá due_date và được ký bởi lender)

// test liquidate_success_transfers_collateral_to_lender_wallet
// (Thanh lý thành công khi toàn bộ NFT/Token thế chấp được chuyển trọn vẹn về ví của lender)

// test liquidate_fail_if_before_due_date
// (Thất bại nếu lender cố tình "xiết nợ" sớm khi thời gian chưa vượt qua mốc due_date)

// test liquidate_fail_if_missing_lender_signature
// (Thất bại nếu quá hạn nhưng giao dịch tịch thu tài sản lại thiếu chữ ký xác thực của lender)

// test liquidate_fail_if_loan_is_still_pending
// (Thất bại nếu cố tình thanh lý một yêu cầu vay chưa từng được giải ngân tiền gốc)

// test liquidate_fail_time_overlap_exploit_attempt
// (Thất bại nếu khoảng thời gian giao dịch (validity_range) mập mờ, có phần giao thoa trước hạn - Chống Time Exploit)

// test liquidate_fail_if_collateral_is_sent_to_wrong_address
// (Thất bại nếu tài sản thế chấp sau thanh lý không về ví lender mà chạy sang ví khác)

// test liquidate_fail_if_borrower_tries_to_liquidate_own_loan
// (Thất bại nếu người đi vay giả mạo lệnh tự thanh lý nhằm mục đích xóa vết nợ xấu trái phép)

// test liquidate_fail_if_validity_range_has_no_finite_lower_bound
// (Thất bại nếu cấu hình thời gian giao dịch dạng vô hạn, không có mốc cụ thể để chứng minh đã quá hạn)

// test liquidate_success_at_exact_next_slot_after_due_date
// (Thanh lý thành công ngay tại slot thời gian kế tiếp liền kề sau thời điểm hết hạn)

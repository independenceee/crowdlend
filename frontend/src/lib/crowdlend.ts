/**
 * Frontend-compatible lending functions
 * Wrapper cho browser wallet (BrowserWallet) thay vì MeshWallet
 */

import { MeshTxBuilder, BlockfrostProvider } from "@meshsdk/core";
import { resolveSlotNo } from "@meshsdk/common";
import {
  resolvePaymentKeyHash,
  applyParamsToScript,
  resolvePlutusScriptAddress,
  parseDatumCbor,
  buildEnterpriseAddress,
  addressToBech32,
  deserializeBech32Address,
} from "@meshsdk/core-cst";


const LENDING_SCRIPT_CBOR =
  "590b4e590b4b01010032323232323232253330023232323232533233008300130093754004264646464646464a66601e60060022a66602460226ea8028540085854ccc03cc02000454ccc048c044dd50050a8010b0a99980798020008a99980918089baa00a15002161533300f3370e90030008a99980918089baa00a150021616300f37540122a66601a6002601c6ea800c4c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc070c04003854ccc070c040c074dd51806980f1baa00f132533301d3011301e375400226464a66603e602860406ea80044c94ccc080c050c084dd50008991919191919191919191919191919191919299981a981c00109919299981a181400089919299981c981e0010a8020b1bae303a001303637540222a666068605a0022a66606e606c6ea8044540085858c0d0dd500809919299981a181400089919299981c981e0010a8020b1bad303a001303637540122a666068605a0022a66606e606c6ea8024540085858c0d0dd500409919299981a18140008a99981b981b1baa003150021615333034302d001132325333039303c0021500416375a6074002606c6ea800c58c0d0dd500109929998199813981a1baa001132325333035302e303637540022646464a6660706604c6eb0c0a4c0e8dd501a8028a99981c19baf3029303a375403266e9520023303c375000697ae0153330383375e604860746ea8064c078cc0f0dd400125eb8054ccc0e0cdd79810181d1baa019301e3303c375200a97ae0153330383371e6eb8c07cc0e8dd500c9bae301f303a37540562a66607066e1cdd69812981d1baa019375a604a60746ea80ac54ccc0e0cdc39bad3023303a37540326eb4c08cc0e8dd50158a99981c19b8f375c605060746ea8064dd71814181d1baa02b153330383371e6eb8c09cc0e8dd500c9bae3027303a375405626603a6eacc080c0e8dd500d8008a5014a029405280a5014a029405280a50323330010013021375a604a60746ea80acccc088dd71814181d1baa02b375c604e60746ea80ad2002222533303d0021001132333004004304100333223233001001005225333042001133043337606ea4010dd3001a5eb7bdb1804c8c8c8c94ccc10ccdc800400109982399bb037520106e9801c01454ccc10ccdc78040010992999822181c18229baa001133048337606ea4024c124c118dd5000802080219299982229998238008a5114a02980103d87a80001302a33048374c00297ae03233300100100800222253330490021001132333004004304d0033322323300100100522533304e00113304f337606ea4010dd4001a5eb7bdb1804c8c8c8c94ccc13ccdc800400109982999bb037520106ea001c01454ccc13ccdc78040010992999828182218289baa001133054337606ea4024c154c148dd5000802080219299982818220008a60103d87a80001303633054375000297ae03370000e0022660a666ec0dd48011ba800133006006003375a60a00066eb8c138008c148008c140004dd718240009bad3049001304b002133047337606ea4008dd3000998030030019bab3044003375c6084004608c00460880026eb8c0f0004dd5981e800981f80119b80001375a6076607860786078607860706ea80a4dd6981d181b9baa00116301b303637546036606c6ea8c08cc0d8dd50189bae3038303537540022c603460686ea804c58c0d8004c0d8008dd7181a000981a0011bae3032001303200230300013030002375a605c002605c0046eb4c0b0004c0b0008dd698150009815001181400098140011bae3026001302237540022c604860426ea800458c02cc080dd50009811180f9baa0011632533302000114c103d87a8000130033302130220014bd701bac3009301e37540322c264a66603a602c01e2a66603a602c603c6ea8c038c07cdd5008099299980f1809180f9baa00113232533302030143021375400226464a666044603660466ea80044c8c8c94ccc094cc04cdd6180b18139baa022375c6018604e6ea806054ccc094cdc40018028a9998129998049bac30123027375404400e601c00426660126eb0c048c09cdd50111bae300c3027375403000229405280a5033300e375c6028604c6ea805cdd7180998131baa01748008cdc01bad30103025375402c66e0ccdc11bad30103025375402c6eb4c038c094dd500b2414138026eb4c09cc090dd50008b180418119baa300830233754602060466ea8078dd6981298111baa00116300b302137540246eb8c08cc080dd50008b1802980f9baa010161533301d301200f1533301d3016301e3754601c603e6ea80404c94ccc078c048c07cdd5000899192999810180a18109baa001132325333022301b3023375400226464a666048660246eb0c054c098dd50108030a99981219b88004002133300837586022604c6ea80840180045280a5033300d375c6026604a6ea8058dd7180918129baa01648008dd6981398121baa00116300830233754601060466ea8c040c08cdd500f1bad3025302237540022c601660426ea8048dd7181198101baa001163005301f37540202c2a66603a6022603c6ea8c038c07cdd5008099299980f198061bac300f302037540366eb8c014c080dd500889998011bac300b302037540366eb8c014c080dd50088008a50333007375c601a603e6ea8040dd71806180f9baa0104800858888c8cc004004010894ccc090004528099299981119192999812180c18129baa001153330243371e6eb8c0a4c098dd50008038998049bab300c3026375400400c2940528180518129baa300a30253754002604e00429444cc00c00c004c09c00488c8cc004004c8cc00400400c894ccc08c00452f5c0264666444646600200200644a6660520022006264660566e9ccc0acdd4803198159814000998159814800a5eb80cc00c00cc0b4008c0ac004dd718110009bab3023001330030033027002302500122533302200114a2264a666040646466e24dd6981398140009991192999812980f18131baa0011480004dd6981518139baa001325333025301e302637540022980103d87a8000132330010013756605660506ea8008894ccc0a8004530103d87a8000132323232533302b337220100042a66605666e3c0200084c044cc0bcdd4000a5eb80530103d87a8000133006006003375a60580066eb8c0a8008c0b8008c0b0004c8cc004004028894ccc0a40045300103d87a8000132323232533302a337220100042a66605466e3c0200084c040cc0b8dd3000a5eb80530103d87a8000133006006003375660560066eb8c0a4008c0b4008c0ac004dd718138011bae302700130270013758604a0042660060060022940c094004dd2a40004603e0024603c603e0024666004911004881000012225333019300d00114bd6f7b6300991919800800a5eb7bdb180894ccc07c0044cc080cdd81ba9006374c00697adef6c6013232323253330203372001400426604866ec0dd48051ba6007005153330203371e01400426604866ec0dd48051ba6007003133024337606ea4008dd3000998030030019bab3021003375c603e00460460046042002646600200297adef6c6022533301e00113301f337606ea4010dd4001a5eb7bdb1804c8c8c8c94ccc07ccdc800400109981199bb037520106ea001c01454ccc07ccdc780400109981199bb037520106ea001c00c4cc08ccdd81ba900237500026600c00c0066eb4c08000cdd7180f001181100118100009180d980e180e180e0009180d180d980d980d980d980d8009180c980d180d00091191980080080191299980c8008a5013253330173371e6eb8c070008010528899801801800980e0009180b980c180c180c180c180c180c180c0009180b180b980b980b980b980b980b8009180a980b180b180b180b180b180b180b180b00098079baa0093012300f37540062c6e1d2000370e900218079808001180700098051baa002370e90010b1805980600118050009805001180400098021baa00114984d9595cd2ab9d5573caae7d5d02ba157441";

const NFT_POLICY_CBOR =
  "58b201010032323232323223225333004323232323253330093370e900018051baa0011323232330010013758602060226022602260226022602260226022601c6ea801c894ccc040004528099299980719b8f375c602400401829444cc00c00c004c0480054ccc028cdc3a400060166ea800c54ccc034c030dd50018a4c2c2c6eb8c034c02cdd50008b1806180680118058009805801180480098031baa00114984d958dd7000ab9a5573aaae7955cfaba15745";

const NETWORK_ID = 0;
const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY ?? "";

// Preview testnet: slot ↔ POSIX ms (genesis = 1666656000 Unix s, 1 slot = 1 s)
const PREVIEW_GENESIS_UNIX_S = 1666656000;
const slotToPosixMs = (slot: number) => (PREVIEW_GENESIS_UNIX_S + slot) * 1000;
const posixMsToSlot = (posixMs: number) => Math.floor(posixMs / 1000) - PREVIEW_GENESIS_UNIX_S;

const provider = new BlockfrostProvider(BLOCKFROST_API_KEY);

export const SCRIPT_ADDRESS = resolvePlutusScriptAddress(
  { code: LENDING_SCRIPT_CBOR, version: "V3" },
  NETWORK_ID
);

export interface LoanDatum {
  borrower: string;
  lender: string | null;
  principal: number;
  interest_rate: number;
  loan_duration: number;
  due_date: number | null;
  collateral_policy: string;
  collateral_name: string;
  status: { type: "Pending" } | { type: "Active"; funded_at: number };
}

export interface LoanUtxo {
  txHash: string;
  outputIndex: number;
  datum: LoanDatum;
  lovelace: string;
  assets: Array<{ unit: string; quantity: string }>;
}

// ============================================================
// Fetch loans từ Blockfrost
// ============================================================

export async function fetchLoans(): Promise<LoanUtxo[]> {
  const url = `https://cardano-preview.blockfrost.io/api/v0/addresses/${SCRIPT_ADDRESS}/utxos`;
  const response = await fetch(url, {
    headers: { project_id: BLOCKFROST_API_KEY },
  });
  if (!response.ok) return [];

  const utxos = (await response.json()) as Array<{
    tx_hash: string;
    output_index: number;
    amount: Array<{ unit: string; quantity: string }>;
    inline_datum: string | null;
  }>;

  const loans: LoanUtxo[] = [];
  for (const utxo of utxos) {
    if (!utxo.inline_datum) continue;
    try {
      const rawDatum = parseDatumCbor(utxo.inline_datum);
      const datum = parseLoanDatum(rawDatum);
      const lovelaceAmt = utxo.amount.find((a) => a.unit === "lovelace");
      loans.push({
        txHash: utxo.tx_hash,
        outputIndex: utxo.output_index,
        datum,
        lovelace: lovelaceAmt?.quantity ?? "0",
        assets: utxo.amount.filter((a) => a.unit !== "lovelace"),
      });
    } catch {
      // skip invalid datums
    }
  }
  return loans;
}

// ============================================================
// getNftInfo — lấy policy ID của NFT minting policy sau khi apply params
// ============================================================

export function getNftPolicyId(issuerPkh: string): {
  policyId: string;
  appliedCbor: string;
} {
  const appliedCbor = applyParamsToScript(
    NFT_POLICY_CBOR,
    [{ bytes: issuerPkh }],
    "JSON"
  );
  const bech32 = resolvePlutusScriptAddress({ code: appliedCbor, version: "V3" }, NETWORK_ID);
  const { scriptHash } = deserializeBech32Address(bech32);
  return { policyId: scriptHash, appliedCbor };
}

// ============================================================
// createLoan — Borrower
// ============================================================

export async function createLoan(
  wallet: any,
  params: {
    principal: number;
    interestRate: number;
    loanDuration: number;
    collateralPolicyId: string;
    collateralAssetName: string;
  }
): Promise<string> {
  const { principal, interestRate, loanDuration, collateralPolicyId, collateralAssetName } = params;
  const borrowerAddress = await wallet.getChangeAddress();
  const borrowerPkh = resolvePaymentKeyHash(borrowerAddress);
  const utxos = await wallet.getUtxos();
  const collateralUtxos = await wallet.getCollateral();

  const collateralUnit = collateralPolicyId + collateralAssetName;
  const nftUtxo = utxos.find((u: any) =>
    u.output.amount.some((a: any) => a.unit === collateralUnit)
  );
  if (!nftUtxo) throw new Error(`NFT ${collateralUnit} not found in wallet`);
  if (!collateralUtxos[0]) throw new Error("No collateral UTxO");

  const datum = buildMeshDatum({
    borrower: borrowerPkh,
    lender: null,
    principal,
    interest_rate: interestRate,
    loan_duration: loanDuration,
    due_date: null,
    collateral_policy: collateralPolicyId,
    collateral_name: collateralAssetName,
    status: { type: "Pending" },
  });

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .txIn(nftUtxo.input.txHash, nftUtxo.input.outputIndex)
    .txOut(SCRIPT_ADDRESS, [
      { unit: "lovelace", quantity: "2000000" },
      { unit: collateralUnit, quantity: "1" },
    ])
    .txOutInlineDatumValue(datum,	"JSON")
    .changeAddress(borrowerAddress)
    .selectUtxosFrom(utxos)
    .txInCollateral(collateralUtxos[0].input.txHash, collateralUtxos[0].input.outputIndex)
    .complete();

  const signedTx = await wallet.signTx(unsignedTx, true);
  return wallet.submitTx(signedTx);
}

// ============================================================
// fundLoan — Lender
// ============================================================

export async function fundLoan(wallet: any, loanUtxo: LoanUtxo): Promise<string> {
  const loan = loanUtxo.datum;
  const lenderAddress = await wallet.getChangeAddress();
  const lenderPkh = resolvePaymentKeyHash(lenderAddress);
  const utxos = await wallet.getUtxos();
  const collateralUtxos = await wallet.getCollateral();
  if (!collateralUtxos[0]) throw new Error("No collateral UTxO");

  // Slot cho MeshSDK invalidBefore (trừ 200 buffer)
  const nowSlot = Number(resolveSlotNo("preview", Date.now()));
  const validFromSlot = nowSlot - 200;
  // POSIX ms tương ứng validFromSlot — đây là giá trị contract thấy
  const validFromPosixMs = slotToPosixMs(validFromSlot);
  const newDatum = buildMeshDatum({
    ...loan,
    lender: lenderPkh,
    due_date: validFromPosixMs + loan.loan_duration,
    status: { type: "Active", funded_at: validFromPosixMs },
  });

  const collateralUnit = loan.collateral_policy + loan.collateral_name;
  const borrowerAddr = pkhToEnterpriseAddress(loan.borrower);

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(loanUtxo.txHash, loanUtxo.outputIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue({ constructor: 0, fields: [] },	"JSON")
    .txInScript(LENDING_SCRIPT_CBOR)
    .txOut(SCRIPT_ADDRESS, [
      { unit: "lovelace", quantity: String(loan.principal + 2000000) },
      { unit: collateralUnit, quantity: "1" },
    ])
    .txOutInlineDatumValue(newDatum,	"JSON")
    .txOut(borrowerAddr, [{ unit: "lovelace", quantity: String(loan.principal) }])
    .requiredSignerHash(lenderPkh)
    .txInCollateral(collateralUtxos[0].input.txHash, collateralUtxos[0].input.outputIndex)
    .invalidBefore(validFromSlot)
    .changeAddress(lenderAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await wallet.signTx(unsignedTx, true);
  return wallet.submitTx(signedTx);
}

// ============================================================
// repayLoan — Borrower
// ============================================================

export async function repayLoan(wallet: any, loanUtxo: LoanUtxo): Promise<string> {
  const loan = loanUtxo.datum;
  const borrowerAddress = await wallet.getChangeAddress();
  const borrowerPkh = resolvePaymentKeyHash(borrowerAddress);
  const utxos = await wallet.getUtxos();
  const collateralUtxos = await wallet.getCollateral();
  if (!collateralUtxos[0]) throw new Error("No collateral UTxO");

  const interest = Math.floor((loan.principal * loan.interest_rate) / 10000);
  const totalRepayment = loan.principal + interest;
  const collateralUnit = loan.collateral_policy + loan.collateral_name;
  const lenderAddr = pkhToEnterpriseAddress(loan.lender!);
  // due_date trong datum là POSIX ms → chuyển về slot cho MeshSDK validity
  const dueDateSlot = posixMsToSlot(loan.due_date!);
  const nowSlot = Number(resolveSlotNo("preview", Date.now()));
  const validFromSlot = nowSlot - 200;

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(loanUtxo.txHash, loanUtxo.outputIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue({ constructor: 1, fields: [] },	"JSON")
    .txInScript(LENDING_SCRIPT_CBOR)
    .txOut(lenderAddr, [{ unit: "lovelace", quantity: String(totalRepayment) }])
    .txOut(borrowerAddress, [
      { unit: collateralUnit, quantity: "1" },
      { unit: "lovelace", quantity: "2000000" },
    ])
    .requiredSignerHash(borrowerPkh)
    .txInCollateral(collateralUtxos[0].input.txHash, collateralUtxos[0].input.outputIndex)
    .invalidBefore(validFromSlot)
    .invalidHereafter(dueDateSlot - 1)
    .changeAddress(borrowerAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await wallet.signTx(unsignedTx, true);
  return wallet.submitTx(signedTx);
}

// ============================================================
// liquidateLoan — Lender
// ============================================================

export async function liquidateLoan(wallet: any, loanUtxo: LoanUtxo): Promise<string> {
  const loan = loanUtxo.datum;
  const lenderAddress = await wallet.getChangeAddress();
  const lenderPkh = resolvePaymentKeyHash(lenderAddress);
  const utxos = await wallet.getUtxos();
  const collateralUtxos = await wallet.getCollateral();
  if (!collateralUtxos[0]) throw new Error("No collateral UTxO");

  const collateralUnit = loan.collateral_policy + loan.collateral_name;

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(loanUtxo.txHash, loanUtxo.outputIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue({ constructor: 2, fields: [] },	"JSON")
    .txInScript(LENDING_SCRIPT_CBOR)
    .txOut(lenderAddress, [
      { unit: collateralUnit, quantity: "1" },
      { unit: "lovelace", quantity: "2000000" },
    ])
    .requiredSignerHash(lenderPkh)
    .txInCollateral(collateralUtxos[0].input.txHash, collateralUtxos[0].input.outputIndex)
    .invalidBefore(posixMsToSlot(loan.due_date!) + 1)
    .changeAddress(lenderAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await wallet.signTx(unsignedTx, true);
  return wallet.submitTx(signedTx);
}

// ============================================================
// cancelLoan — Borrower
// ============================================================

export async function cancelLoan(wallet: any, loanUtxo: LoanUtxo): Promise<string> {
  const loan = loanUtxo.datum;
  const borrowerAddress = await wallet.getChangeAddress();
  const borrowerPkh = resolvePaymentKeyHash(borrowerAddress);
  const utxos = await wallet.getUtxos();
  const collateralUtxos = await wallet.getCollateral();
  if (!collateralUtxos[0]) throw new Error("No collateral UTxO");

  const collateralUnit = loan.collateral_policy + loan.collateral_name;

  const txBuilder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(loanUtxo.txHash, loanUtxo.outputIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue({ constructor: 3, fields: [] },	"JSON")
    .txInScript(LENDING_SCRIPT_CBOR)
    .txOut(borrowerAddress, [
      { unit: collateralUnit, quantity: "1" },
      { unit: "lovelace", quantity: "2000000" },
    ])
    .requiredSignerHash(borrowerPkh)
    .txInCollateral(collateralUtxos[0].input.txHash, collateralUtxos[0].input.outputIndex)
    .changeAddress(borrowerAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await wallet.signTx(unsignedTx, true);
  return wallet.submitTx(signedTx);
}

// ============================================================
// Helpers
// ============================================================

function buildMeshDatum(loan: LoanDatum) {
  const statusConstructor =
    loan.status.type === "Pending"
      ? { constructor: 0, fields: [] }
      : { constructor: 1, fields: [{ int: (loan.status as any).funded_at }] };
  return {
    constructor: 0,
    fields: [
      { bytes: loan.borrower },
      loan.lender !== null
        ? { constructor: 0, fields: [{ bytes: loan.lender }] }
        : { constructor: 1, fields: [] },
      { int: loan.principal },
      { int: loan.interest_rate },
      { int: loan.loan_duration },
      loan.due_date !== null
        ? { constructor: 0, fields: [{ int: loan.due_date }] }
        : { constructor: 1, fields: [] },
      { bytes: loan.collateral_policy },
      { bytes: loan.collateral_name },
      statusConstructor,
    ],
  };
}

function pkhToEnterpriseAddress(pkh: string): string {
  const addr = buildEnterpriseAddress(NETWORK_ID, pkh);
  return addressToBech32(addr.toAddress());
}

/** Parse raw Plutus Data JSON → LoanDatum interface
 *  parseDatumCbor returns constructor/int as strings → use == for comparison */
function parseLoanDatum(raw: any): LoanDatum {
  const f = raw.fields;
  const borrower = f[0].bytes as string;
  // eslint-disable-next-line eqeqeq
  const lender = f[1].constructor == 0 ? (f[1].fields[0].bytes as string) : null;
  const principal = Number(f[2].int);
  const interest_rate = Number(f[3].int);
  const loan_duration = Number(f[4].int);
  // eslint-disable-next-line eqeqeq
  const due_date = f[5].constructor == 0 ? Number(f[5].fields[0].int) : null;
  const collateral_policy = f[6].bytes as string;
  const collateral_name = f[7].bytes as string;
  const statusRaw = f[8];
  // eslint-disable-next-line eqeqeq
  const status =
    statusRaw.constructor == 0
      ? ({ type: "Pending" } as const)
      : ({ type: "Active", funded_at: Number(statusRaw.fields[0].int) } as const);
  return { borrower, lender, principal, interest_rate, loan_duration, due_date, collateral_policy, collateral_name, status };
}

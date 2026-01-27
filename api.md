Withdraw from payment account​Copy link
Withdraw funds from payment account back to wallet

Body
required
application/json
amountCopy link to amount
Type:integer
required
Example
Integer numbers.

wallet_addressCopy link to wallet_address
Type:string
required
Example



curl https://shadow.radr.fun/shadowpay/v1/payment/withdraw \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: 4RWb4myx8dUNQ3zx5zkwTT2wk3HnWbyNEHaxNnCDob4w' \
  --data '{
  "wallet_address": "AVSSWPbWRYDF7w8GZcrP6yVWsmRWPshMnziHqFQ5RaDR",
  "amount": 5000000
}'

Authorize payment (x402 flow step 1)​Copy link
Check escrow balance and authorize payment for x402 flow. Returns access token for immediate content access while proof generates.

Body
required
application/json
amountCopy link to amount
Type:integer
required
Example
Payment amount in lamports

commitmentCopy link to commitment
Type:string
required
Example
Payment commitment

merchantCopy link to merchant
Type:string
required
Example
Merchant wallet address

nullifierCopy link to nullifier
Type:string
required
Example
Payment nullifier

Responses

200
Payment authorized

curl https://shadow.radr.fun/shadowpay/v1/payment/authorize \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: 4RWb4myx8dUNQ3zx5zkwTT2wk3HnWbyNEHaxNnCDob4w' \
  --data '{
  "commitment": "12345678901234567890",
  "nullifier": "98765432109876543210",
  "amount": 1000000,
  "merchant": "8Rem8ZqgVEg5TWS8hPTCEP91k6jNs2UhqWGBp5Nfnz4F"
}'

Verify access token (x402 flow step 2)​Copy link
Verify that an access token is valid and payment is authorized

Headers
X-Access-TokenCopy link to X-Access-Token
Type:string
required
Access token from authorize endpoint

Responses

200
Access verified

curl https://shadow.radr.fun/shadowpay/v1/payment/verify-access \
  --header 'X-Access-Token: '

  Settle payment (x402 flow step 3)​Copy link
Submit ZK proof to settle the payment on-chain. Must be called after authorize and before proof_deadline.

Body
required
application/json
commitmentCopy link to commitment
Type:string
required
Example
proofCopy link to proof
Type:string
required
Base64-encoded Groth16 proof

public_signalsCopy link to public_signals
Type:array string[]
required
Example
encrypted_amountCopy link to encrypted_amount
Type:array,null integer
ElGamal encrypted amount (64 bytes)

Responses

200
Payment settled

curl https://shadow.radr.fun/shadowpay/v1/payment/settle \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: 4RWb4myx8dUNQ3zx5zkwTT2wk3HnWbyNEHaxNnCDob4w' \
  --data '{
  "commitment": "12345678901234567890",
  "proof": "",
  "public_signals": [
    "123",
    "456",
    "789"
  ],
  "encrypted_amount": [
    1
  ]
}'

User withdraws SOL from escrow​Copy link
Create an unsigned transaction for a user to withdraw their SOL balance from escrow back to their wallet.

Requirements:

User must sign the transaction
Must have sufficient balance in escrow
Calls the user_withdraw instruction on the smart contract
Body
required
application/json
amountCopy link to amount
Type:integer
required
Example
Amount to withdraw in lamports

wallet_addressCopy link to wallet_address
Type:string
required
Example
User's wallet address (must sign transaction)

Responses

200
application/json
Unsigned transaction created

Type:object
last_valid_block_height
Type:integer
Example
Last valid block height

recent_blockhash
Type:string
Recent blockhash used

unsigned_tx_base64
Type:string
Base64-encoded unsigned transaction


400
application/json
Invalid request or insufficient balance

Type:object
error
Type:string
Example
status
Type:string
Example

curl https://shadow.radr.fun/shadowpay/api/escrow/withdraw \
  --request POST \
  --header 'Content-Type: application/json' \
  --data '{
  "wallet_address": "AVSSWPbWRYDF7w8GZcrP6yVWsmRWPshMnziHqFQ5RaDR",
  "amount": 10000000
}'


# Local broker

`server.mjs` implements an authenticated HTTP broker on loopback `127.0.0.1:19848`. Swift polls it through native messaging; webpage origins are rejected. Five-minute one-use pairing creates a separate native credential. The administrator credential lives in a restricted local file.

Only explicitly assigned tabs are routed. Each tab permits one outstanding request. Identical request IDs deduplicate for ten minutes in memory; conflicting arguments are rejected. A dispatched timeout remains `unknown`, with any late result attached separately. Restart loses request history and is not a safe basis for replaying submissions.

`demo.mjs` is a synthetic local test page, served at `/demo`. It does not call the broker API.

# RAILGUN Advanced Setup Ceremony

> zk-SNARKs require a pre-existing setup between the prover and verifier. A set of public parameters define the “rules of the game” for the construction of zk-SNARKs. This app allows everyone to contribute their own entropy. Contributors can verify that their entropy contributions were included, and tweet the hash of their contribution transcript to allow others to verify this as well. This README will be updated with instructions to verify the finalized artifacts when the ceremony is complete.

This ceremony is built upon iden3 [snarkjs](https://github.com/iden3/snarkjs) (Groth16 Protocol), which is patched to make the `phase2verifyFromInit` return multi-party compute params including contribution hashes rather than true/false.

While contributions to a single circuit must be done in series, this ceremony allows multiple contributors to partcipate at the same time by sending them challenges for any circuits that are not currently being worked on. Each contributor will ideally contribute to one round for all 54 circuits, though this is not required.

––

The Advanced Circuit Ceremony is live now at:

https://ceremony.railgun.org

There are 54 new circuits to lend us the most efficiency and flexibility in composing transactions.

You can sign in with Twitter or GitHub, then click run. It will take about an hour, possibly more if multiple people are doing it at once because server side verification is rather intense. All you have to do is leave your browser open until complete until it's done. If you have to stop it's fine; you can resume by signing in with the same account.

Once complete, the site will say so and show you the hash of your transcript. The transcript consists of all the hashes of your contributions, allowing you to attest to all 54 contributions with one hash (use the Twitter button, please). This hash will also be shown on your contributor page, which may be "view"ed from the contributors list (see navigation).

There is no need to manually orchestrate as the server will give you a circuit that is not currently being contributed to, and continue through the rest accordingly.

Your participation is most appreciated!

--

Thank you to the anonymous devs and open source code that contributed to this. We cannot take all the credit.

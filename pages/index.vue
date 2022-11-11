<template>
  <div class="ceremony">
    <h1 class="title is-size-1 is-size-2-mobile is-spaced">
      RAILGUN <span>Advanced Setup Ceremony</span>
    </h1>
    <p class="p p-larger">
      RAILGUN's private wallet implementation depends on complex UTXO balances. This Advanced Setup
      Ceremony will construct new zero-knowledge circuits for RAILGUN, enabling complex balance
      structures for private transactions, and minimizing gas expenditure for all RAILGUN users.
    </p>
    <p class="p p-larger">
      Please contribute with your source of entropy. Given at least one fully trustless
      contribution, RAILGUN will remain fully private and secure.
    </p>
    <div class="buttons is-centered">
      <b-button type="is-primary" outlined tag="router-link" to="/contribute">
        Make Privacy Contribution
      </b-button>
    </div>
  </div>
</template>

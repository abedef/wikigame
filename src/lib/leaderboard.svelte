<script lang="ts">
  import type { Player, PlayerID } from "$lib";

  export let players: Player[];
  export let guesser: PlayerID;
  export let thisPlayer: PlayerID;
  export let kick: (id: PlayerID) => void;
  export let guess: (id: PlayerID) => void;
</script>

<div>
  {#each players ?? [] as player}
    <code title={player.id}
      >{#if thisPlayer === guesser}
        <a href="#" on:click={() => guess(player.id)}>?</a>
      {/if}
      {#if player.id === guesser}👑 {/if}{player.name.length > 0
        ? player.name
        : player.id}
      {player.score}
      {player.id === thisPlayer ? " (you)" : ""}
      {#if thisPlayer === guesser}
        <a href="#" on:click={() => kick(player.id)}>×</a>
      {/if}
    </code>
  {/each}
</div>

<style>
  code {
    display: block;
  }
</style>

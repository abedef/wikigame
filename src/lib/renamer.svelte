<script lang="ts">
  export let name: string;
  export let saveName: () => void;

  let rawName = "";

  let editing = false;

  const beginEditing = () => (editing = true);
  const finishEditing = () => (editing = false);
</script>

<p>hi</p>

<span>
  <input
    type="text"
    name="name"
    id="name"
    placeholder="Enter name"
    bind:value={name}
  />
  <input
    type="submit"
    value="Save"
    on:click={saveName}
    disabled={name.length === 0}
  />
</span>

<div on:click={beginEditing} on:>
  <input type="text" bind:value={rawName} placeholder="Enter name" />
</div>

<style>
  input {
    border: none;
    cursor: pointer;
    font-weight: bold;
    text-align: center;
  }
  input:focus {
    font-weight: normal;
  }
</style>

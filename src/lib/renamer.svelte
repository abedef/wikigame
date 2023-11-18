<script lang="ts">
  export let name = "";
  export let saveName: (name: string) => void;

  let nameInput: HTMLInputElement;

  $: placeholder = editing
    ? "Hit enter to submit".toUpperCase()
    : "Enter your name".toUpperCase();

  let editing = false;

  const beginEditing = () => {
    editing = true;
  };
  const finishEditing = (e?: KeyboardEvent | FocusEvent) => {
    if (e instanceof KeyboardEvent) if (e.key !== "Enter") return;
    nameInput.blur();
    editing = false;
    if (name.length > 0) saveName(name);
  };
</script>

<input
  bind:this={nameInput}
  type="text"
  bind:value={name}
  {placeholder}
  on:focus={beginEditing}
  on:keydown={finishEditing}
  on:blur={finishEditing}
/>

<style>
  input {
    border: none;
    cursor: pointer;
    font-weight: bold;
    text-align: center;
    display: inline-block;
    min-width: fit-content;
  }
  input:focus {
    font-weight: normal;
    cursor: default;
  }
</style>

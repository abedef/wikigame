<script lang="ts">
  export let code: string;
</script>

<div class="roomCodeDisplay">
  <h4 class="code">{code}</h4>
  <h6 class="code">Room code</h6>
</div>

<style>
  div.roomCodeDisplay {
    display: flex;
    flex-direction: column;
  }
  h4.code {
    margin: 0;
  }

  h6.code {
    margin: 0;
    text-transform: uppercase;
  }
</style>

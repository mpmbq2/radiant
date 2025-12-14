<script lang="ts">
  import { onMount } from 'svelte';

  let message = 'Hello World from Radiant!';
  let count = 0;

  function incrementCount() {
    count++;
  }

  // Test IPC communication
  function testIPC() {
    if (window.electronAPI) {
      window.electronAPI.sendMessage('toMain', {
        test: 'Hello from renderer!',
      });
    }
  }

  onMount(() => {
    if (window.electronAPI) {
      window.electronAPI.onMessage('fromMain', (data) => {
        console.log('Received from main:', data);
      });
    }
  });
</script>

<main>
  <h1>{message}</h1>
  <p>Counter: {count}</p>
  <button on:click={incrementCount}>Increment</button>
  <button on:click={testIPC}>Test IPC</button>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      Oxygen,
      Ubuntu,
      Cantarell,
      sans-serif;
  }

  h1 {
    color: #333;
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }

  button {
    margin: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border: none;
    border-radius: 4px;
    background-color: #007bff;
    color: white;
    cursor: pointer;
  }

  button:hover {
    background-color: #0056b3;
  }
</style>

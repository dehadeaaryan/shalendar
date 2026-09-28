<script lang="ts">
 import { onMount, type Snippet } from 'svelte';
 let { label, onClose, wide = false, children } = $props<{ label: string; onClose: () => void; wide?: boolean; children: Snippet }>();
 let dialog: HTMLDialogElement;
 onMount(() => {
  const previousOverflow = document.body.style.overflow;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
  return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
 });
 function closeOutside(event: MouseEvent) {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
 }
</script>
<dialog bind:this={dialog} class="modal-shell" class:modal-wide={wide} aria-label={label} onclose={onClose} onclick={closeOutside}>
 {@render children()}
</dialog>

<script lang="ts">
 const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
 const blocks = [
  { day: 0, row: 1, title: 'Morning run', time: '08:00', tone: 'peach' },
  { day: 1, row: 2, title: 'Deep work', time: '10:00', tone: 'lavender' },
  { day: 2, row: 1, title: 'Coffee together', time: '09:00', tone: 'sage' },
  { day: 3, row: 3, title: 'Design time', time: '14:00', tone: 'peach' },
  { day: 4, row: 2, title: 'Weekend plans', time: '12:00', tone: 'lavender' }
 ];
</script>
<div class="calendar-preview" aria-label="Example of a shared weekly calendar">
 <div class="preview-heading"><div><span class="eyebrow">A little more in sync</span><h2>Your week, together.</h2></div><span class="preview-badge">Preview</span></div>
 <div class="preview-people"><span><i class="peach-dot"></i>Alex</span><span><i class="lavender-dot"></i>Sam</span><span class="preview-zone">One shared view</span></div>
 <div class="preview-grid" aria-hidden="true">
  {#each days as day, i}<div class:preview-today={i === 2} class="preview-day"><span>{day}</span><strong>{14 + i}</strong></div>{/each}
  {#each Array.from({ length: 15 }) as _, i}<div class="preview-cell" style="grid-column: {i % 5 + 1}; grid-row: {Math.floor(i / 5) + 2}"></div>{/each}
  {#each blocks as block}<div class="preview-event {block.tone}" style="grid-column: {block.day + 1}; grid-row: {block.row + 1}"><span>{block.time}</span><strong>{block.title}</strong></div>{/each}
 </div>
 <div class="preview-note"><span class="status-dot"></span>A little space for the things that matter.</div>
</div>

<script lang="ts">
 import { Columns4, ChevronLeft } from 'lucide-svelte';
 const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
</script>

<div class="calendar-preview" aria-label="Example week view with collapsible days and separate member columns">
 <div class="preview-heading">
  <div class="preview-title"><Columns4 size={18} /><h2>The week ahead</h2></div>
  <span class="preview-badge">Example</span>
 </div>
 <div class="preview-week">
  {#each days as day, index}
   <section class:preview-expanded={index === 3} class="preview-day-panel">
    {#if index === 3}
     <div class="preview-day-heading"><span class="preview-date active">17</span><strong>Wed, Jun</strong><span class="preview-count">3</span><ChevronLeft size={14} /></div>
     <div class="preview-member-grid" aria-hidden="true">
      <div class="preview-member-heading preview-hours-heading">24H</div>
      <div class="preview-member-heading"><i class="peach-dot"></i>Alex</div>
      <div class="preview-member-heading"><i class="lavender-dot"></i>Sam</div>
      <div class="preview-hours">{#each ['09:00', '10:00', '11:00', '12:00'] as hour}<span>{hour}</span>{/each}</div>
      <div class="preview-member-track">
       <div class="preview-schedule-event peach" style="top: 12px; height: 48px"><strong>Morning run</strong><span>09:00 – 10:00</span></div>
       <div class="preview-schedule-event peach" style="top: 114px; height: 48px"><strong>Lunch</strong><span>11:00 – 12:00</span></div>
      </div>
      <div class="preview-member-track">
       <div class="preview-schedule-event lavender" style="top: 63px; height: 74px"><strong>Deep work</strong><span>10:00 – 11:30</span></div>
      </div>
     </div>
    {:else}
     <div class="preview-collapsed-day"><span>{day}</span><strong class="preview-date">{14 + index}</strong><span>Jun</span></div>
    {/if}
   </section>
  {/each}
 </div>
</div>

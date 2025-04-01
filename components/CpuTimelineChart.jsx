'use client';
import React, { useEffect, useRef } from 'react';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import { Timeline } from 'vis-timeline/standalone';

// Helper function to choose a background color based on a job's ID
const getJobColor = (jobId) => {
  if (jobId === "IDLE") return "#f0f0f0";
  const colors = [
    '#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6',
    '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D'
  ];
  return colors[Number(jobId) % colors.length];
};

export default function CpuTimelineChart({ cpus }) {
  const timelineRef = useRef(null);
  const timelineInstanceRef = useRef(null);

  useEffect(() => {
    // If no CPU data, clean up and exit
    if (!cpus || cpus.length === 0) {
      if (timelineInstanceRef.current) {
        timelineInstanceRef.current.destroy();
        timelineInstanceRef.current = null;
      }
      return;
    }

    if (!timelineRef.current) return;

    // Create groups for each CPU
    const groups = cpus.map(cpu => ({
      id: `cpu-${cpu.id}`,
      content: `CPU ${cpu.id + 1}`
    }));

    // Convert CPU history into timeline items
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0); // set base time to midnight
    const items = [];

    cpus.forEach(cpu => {
      if (cpu.history && Array.isArray(cpu.history)) {
        cpu.history.forEach(segment => {
          items.push({
            id: `${cpu.id}-${segment.job}-${segment.start}-${segment.end}`,
            group: `cpu-${cpu.id}`,
            content: segment.job === "IDLE" ? "Idle" : `Job ${segment.job}`,
            start: new Date(baseDate.getTime() + segment.start * 1000),
            end: new Date(baseDate.getTime() + segment.end * 1000),
            style: `background-color: ${getJobColor(segment.job)};`
          });
        });
      }
    });

    // Timeline options (disable move/zoom, no scroll)
    const options = {
      stack: true,
      editable: false,
      moveable: false,
      zoomable: false,
      margin: {
        item: 10,
        axis: 5
      },
      timeAxis: { scale: 'second', step: 1 }
    };

    // Destroy any existing timeline
    if (timelineInstanceRef.current) {
      timelineInstanceRef.current.destroy();
    }

    // Create the timeline
    timelineInstanceRef.current = new Timeline(timelineRef.current, items, groups, options);

    // Auto-fit to ensure items are fully visible
    timelineInstanceRef.current.fit();

  }, [cpus]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <h3 style={{ margin: 0, padding: '0.5rem', backgroundColor: '#f5f5f5' }}>
        CPU Timeline Visualization (vis-timeline)
      </h3>
      <div
        ref={timelineRef}
        style={{
          position: 'absolute',
          top: '3rem',
          left: 0,
          right: 0,
          bottom: 0,
          border: '1px solid lightgray',
          overflow: 'hidden' // no scroll
        }}
      />
    </div>
  );
}
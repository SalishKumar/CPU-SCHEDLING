'use client';
import React, { useEffect, useRef } from 'react';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import { Timeline } from 'vis-timeline/standalone';

const getJobColor = jobId => {
  if (jobId === "IDLE") return "#f0f0f0";
  const colors = [
    '#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6',
    '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D'
  ];
  return colors[Number(jobId) % colors.length];
};



//deplo

export default function CpuTimelineChart({ cpus, readyQueueHistory }) {
  const timelineRef = useRef(null);
  const timelineInstanceRef = useRef(null);

  useEffect(() => {
    if ((!cpus || cpus.length === 0) && (!readyQueueHistory || readyQueueHistory.length === 0)) {
      if (timelineInstanceRef.current) {
        timelineInstanceRef.current.destroy();
        timelineInstanceRef.current = null;
      }
      return;
    }
    if (!timelineRef.current) return;

    const groups = [
      ...cpus.map(cpu => ({
        id: `cpu-${cpu.id}`,
        content: `CPU ${cpu.id + 1}`
      })),
      { id: "ready-queue", content: "Ready Queue" }
    ];

    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
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

    let finalReadyQueueHistory = [];
    if (!readyQueueHistory || readyQueueHistory.length === 0 || readyQueueHistory[0].start > 0) {
      let syntheticJobs = [];
      cpus.forEach(cpu => {
        if (cpu.history && cpu.history.length > 0) {
          const firstSegment = cpu.history[0];
          if (firstSegment.start === 0) {
            syntheticJobs.push({ id: firstSegment.job, remainingTime: "" });
          }
        }
      });
      if (syntheticJobs.length > 0) {
        finalReadyQueueHistory.push({
          start: 0,
          end: readyQueueHistory && readyQueueHistory.length > 0 ? readyQueueHistory[0].start : 1,
          jobs: syntheticJobs
        });
      }
      if (readyQueueHistory && readyQueueHistory.length > 0) {
        finalReadyQueueHistory = finalReadyQueueHistory.concat(readyQueueHistory);
      }
    } else {
      finalReadyQueueHistory = readyQueueHistory;
    }

    finalReadyQueueHistory
      .filter(snapshot => snapshot.jobs && snapshot.jobs.length > 0)
      .forEach((snapshot, index) => {
        const multilineContent = snapshot.jobs
          .map(job => `J${job.id}${job.remainingTime ? ` (${job.remainingTime})` : ''}`)
          .join("<br/>");
        const content = `<div style="white-space: pre-wrap;">${multilineContent}</div>`;
        items.push({
          id: `ready-${index}`,
          group: "ready-queue",
          content,
          start: new Date(baseDate.getTime() + snapshot.start * 1000),
          end: new Date(baseDate.getTime() + (snapshot.end ? snapshot.end * 1000 : (snapshot.start + 1) * 1000)),
          style: "background-color: #d0d0d0;"
        });
      });

    const options = {
      stack: true,
      editable: false,
      moveable: false,
      zoomable: false,
      margin: { item: 10, axis: 5 },
      timeAxis: { scale: 'second', step: 1 }
    };

    if (timelineInstanceRef.current) {
      timelineInstanceRef.current.destroy();
    }
    timelineInstanceRef.current = new Timeline(timelineRef.current, items, groups, options);
    timelineInstanceRef.current.fit();
  }, [cpus, readyQueueHistory]);

  return (
    <div style={{ width: '100%', height: '500px', position: 'relative' }}>
      <h3 style={{ margin: 0, padding: '0.5rem', backgroundColor: '#f5f5f5' }}>
        CPU Timeline Visualization
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
          overflow: 'auto'
        }}
      />
    </div>
  );
}
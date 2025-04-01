'use client';
import Image from "next/image";
import styles from "./page.module.css";
import { useState } from "react";
import CpuTimelineChart from "@/components/CpuTimelineChart";

export default function Home() {
  const algorithms = [
    { name: "Shortest Remaining Time First", label: "SRTF" },
  ];

  const [cpu, setCpu] = useState(2);
  const [jobs, setJobs] = useState([
    { id: 1, arrivalTime: "0", burstTime: "5" },
    { id: 2, arrivalTime: "2", burstTime: "3" },
    { id: 3, arrivalTime: "4", burstTime: "4" }
  ]);
  const [cpuTimeline, setCpuTimeline] = useState([]);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(algorithms[0].name);

  const colTable = [
    "Job ID",
    "Arrival Time",
    "Burst Time",
    "Start Time",
    "End Time",
    "Turnaround Time",
    "Action"
  ];

  const handleInputChange = (e, jobId, field) => {
    const value = e.target.value;
    setJobs((prevJobs) =>
      prevJobs.map((job) =>
        job.id === jobId ? { ...job, [field]: value } : job
      )
    );
  };

  const validateForm = () => {
    if (cpu <= 0) {
      alert("Please enter a valid number of CPUs");
      return false;
    }
    for (const job of jobs) {
      if (
        job.arrivalTime === undefined ||
        job.burstTime === undefined ||
        job.arrivalTime === "" ||
        job.burstTime === "" ||
        isNaN(Number(job.arrivalTime)) ||
        isNaN(Number(job.burstTime)) ||
        Number(job.arrivalTime) < 0 ||
        Number(job.burstTime) <= 0
      ) {
        alert(`Please enter valid Arrival and Burst Times for Job ID ${job.id}`);
        return false;
      }
    }
    return true;
  };

  const calculateTimes = () => {
    if (!validateForm()) return;

    // Initialize CPUs. Each CPU stores its current job and a history of segments.
    let cpus = [];
    for (let i = 0; i < cpu; i++) {
      cpus.push({
        id: i,
        currentJob: null,
        currentSegmentStart: undefined,
        history: []
      });
    }

    // Prepare a working copy of jobs with additional fields
    let jobsCopy = jobs.map((job) => ({
      ...job,
      arrivalTime: Number(job.arrivalTime),
      burstTime: Number(job.burstTime),
      remainingTime: Number(job.burstTime),
      startTime: undefined,
      endTime: undefined,
      turnaroundTime: undefined
    }));

    let currentTime = 0;

    // Continue simulation until all jobs are finished
    while (jobsCopy.some(job => job.remainingTime > 0)) {
      // Get jobs that have arrived and are not finished
      const readyJobs = jobsCopy.filter(job => job.arrivalTime <= currentTime && job.remainingTime > 0);

      // Preemption check: for each CPU, see if a new job should preempt the currently running job
      cpus.forEach(cpuObj => {
        if (cpuObj.currentJob) {
          // Look for any ready job (other than the one currently running) with less remaining time
          const candidate = readyJobs
            .filter(job => job.id !== cpuObj.currentJob.id)
            .sort((a, b) => a.remainingTime - b.remainingTime)[0];
          if (candidate && candidate.remainingTime < cpuObj.currentJob.remainingTime) {
            // Preempt current job: record its timeline segment and release the CPU
            if (cpuObj.currentSegmentStart !== undefined) {
              cpuObj.history.push({
                start: cpuObj.currentSegmentStart,
                end: currentTime,
                job: cpuObj.currentJob.id
              });
            }
            cpuObj.currentJob = null;
            cpuObj.currentSegmentStart = undefined;
          }
        }
      });

      // Determine which jobs are currently running on some CPU (to avoid duplicate assignment)
      const runningJobIds = cpus
        .filter(cpuObj => cpuObj.currentJob !== null)
        .map(cpuObj => cpuObj.currentJob.id);

      // Assign available jobs to idle CPUs
      cpus.forEach(cpuObj => {
        if (!cpuObj.currentJob) {
          // Find an available job (not already running) with the smallest remaining time
          const availableJobs = readyJobs.filter(job => !runningJobIds.includes(job.id));
          if (availableJobs.length > 0) {
            const candidate = availableJobs.sort((a, b) => a.remainingTime - b.remainingTime)[0];
            cpuObj.currentJob = candidate;
            // Record the start time of the job if not set already
            if (candidate.startTime === undefined) {
              candidate.startTime = currentTime;
            }
            cpuObj.currentSegmentStart = currentTime;
            runningJobIds.push(candidate.id);
          }
        }
      });

      // Execute one time unit on each CPU that has a job
      cpus.forEach(cpuObj => {
        if (cpuObj.currentJob) {
          cpuObj.currentJob.remainingTime -= 1;
          // If the job finishes, record its finish time and timeline segment
          if (cpuObj.currentJob.remainingTime <= 0) {
            cpuObj.currentJob.endTime = currentTime + 1;
            cpuObj.currentJob.turnaroundTime = cpuObj.currentJob.endTime - cpuObj.currentJob.arrivalTime;
            cpuObj.history.push({
              start: cpuObj.currentSegmentStart,
              end: currentTime + 1,
              job: cpuObj.currentJob.id
            });
            cpuObj.currentJob = null;
            cpuObj.currentSegmentStart = undefined;
          }
        }
      });

      // Advance time by 1 time unit
      currentTime++;
    }

    // Update jobs state with the calculated times and update the CPU timeline for visualization
    setJobs(jobsCopy);
    setCpuTimeline(cpus);
  };

  const deleteJob = (jobId) => {
    setJobs(jobs.filter((job) => job.id !== jobId));
  };

  return (
    <div className={styles.page}>
      <h1>CPU Scheduling (SRTF)</h1>
      <div className={styles.group}>
        <label htmlFor="cpus">Enter number of CPUs</label>
        <input
          type="number"
          min="1"
          id="cpus"
          value={cpu}
          onChange={(e) => setCpu(Number(e.target.value))}
          placeholder="Enter number of CPUs"
        />
      </div>
      {/* For SRTF, no quantum input is needed */}
      <div className={styles.group}>
        <button
          className={styles.button}
          onClick={() => {
            let lastJobId = jobs.length > 0 ? jobs[jobs.length - 1].id : 0;
            setJobs([...jobs, { id: lastJobId + 1 }]);
          }}
        >
          Add JOB
        </button>
        <button className={styles.button} onClick={() => {
          setJobs([]);
          setCpuTimeline([]);
        }}>
          Clear
        </button>
        <button className={styles.button} onClick={calculateTimes}>
          Calculate
        </button>
      </div>
      <table>
        <thead>
          <tr>
            {colTable.map((col, index) => (
              <th key={index}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>{job.id}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  placeholder="Arrival Time"
                  value={job.arrivalTime || ""}
                  onChange={(e) => handleInputChange(e, job.id, "arrivalTime")}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0.1"
                  placeholder="Burst Time"
                  value={job.burstTime || ""}
                  onChange={(e) => handleInputChange(e, job.id, "burstTime")}
                />
              </td>
              <td>{job.startTime ?? "-"}</td>
              <td>{job.endTime ?? "-"}</td>
              <td>{job.turnaroundTime ?? "-"}</td>
              <td>
                <button
                  className={styles.button}
                  onClick={() => deleteJob(job.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {cpuTimeline.length > 0 && (
        <CpuTimelineChart cpus={cpuTimeline} />
      )}
    </div>
  );
}
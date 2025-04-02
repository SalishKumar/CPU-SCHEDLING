'use client';
import Image from "next/image";
import styles from "./page.module.css";
import { useState } from "react";
import CpuTimelineChart from "@/components/CpuTimelineChart";

export default function Home() {
  const algorithms = [
    { name: "Shortest Remaining Time First with Quantum", label: "SRTF-Q" }
  ];

  const [cpu, setCpu] = useState(2);
  const [quantum, setQuantum] = useState(1);
  const [jobs, setJobs] = useState([
    { id: 1, arrivalTime: "0", burstTime: "5" },
    { id: 2, arrivalTime: "2", burstTime: "1.5" },
    { id: 3, arrivalTime: "2", burstTime: "4" }
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
    if (quantum <= 0) {
      alert("Please enter a valid quantum value (minimum 1)");
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
    calculateEventDrivenSRTF();
  };

  const calculateEventDrivenSRTF = () => {
    let cpus = [];
    for (let i = 0; i < cpu; i++) {
      cpus.push({
        id: i,
        currentJob: null,
        quantumRemaining: quantum,
        history: [],
        currentSegmentStart: null,
      });
    }

    let jobsCopy = jobs.map((job) => ({
      ...job,
      arrivalTime: Number(job.arrivalTime),
      burstTime: Number(job.burstTime),
      remainingTime: Number(job.burstTime),
      startTime: undefined,
      endTime: undefined,
      turnaroundTime: undefined,
      added: false,
    }));
    jobsCopy.sort((a, b) => a.arrivalTime - b.arrivalTime);

    let currentTime = 0;
    let readyQueue = [];
    console.log("***** start *****");
    let itearation = 1;
    while (
      jobsCopy.some(j => j.remainingTime > 0) ||
      readyQueue.length > 0 ||
      cpus.some(c => c.currentJob)
    ) {
      console.log("***** Iteration:", itearation++,"*****");
      jobsCopy.forEach(job => {
        if (!job.added && job.arrivalTime <= currentTime) {
          readyQueue.push(job);
          job.added = true;
          console.log("Job added to readyQueue:", job.id);
        }
      });

      console.log("Current Time:", currentTime);
      cpus.forEach(cpuObj => {
        if (!cpuObj.currentJob && readyQueue.length > 0) {
          readyQueue.sort((a, b) => a.remainingTime - b.remainingTime);
          const nextJob = readyQueue.shift();
          cpuObj.currentJob = nextJob;
          if (nextJob.startTime === undefined) {
            nextJob.startTime = currentTime;
          }
          cpuObj.currentSegmentStart = currentTime;
          cpuObj.quantumRemaining = quantum;
          console.log(`Assigned job ${nextJob.id} to CPU ${cpuObj.id}`);
        }
      });

      let nextEventTime = Infinity;
      cpus.forEach(cpuObj => {
        if (cpuObj.currentJob) {
          const timeToFinish = cpuObj.currentJob.remainingTime;
          const timeToQuantumExpire = cpuObj.quantumRemaining;
          console.log("quantmRemaining:", timeToQuantumExpire,"timeToFinish:", timeToFinish);
          const cpuEvent = currentTime + Math.min(timeToFinish, timeToQuantumExpire);
          if (cpuEvent < nextEventTime) {
            nextEventTime = cpuEvent;
          }
        }
      });
      if (jobsCopy.some(j => !j.added)) {
        const nextArrival = jobsCopy.find(j => !j.added).arrivalTime;
        nextEventTime = Math.min(nextEventTime, nextArrival);
      }

      console.log("Next event time:", nextEventTime);
      if (nextEventTime === Infinity) break;
      let delta = nextEventTime - currentTime;
      console.log("Delta:", delta);

      cpus.forEach(cpuObj => {
        if (cpuObj.currentJob) {
          cpuObj.currentJob.remainingTime -= delta;
          cpuObj.quantumRemaining -= delta;
        }
      });
      currentTime = nextEventTime;

      cpus.forEach(cpuObj => {
        if (cpuObj.currentJob) {
          if (cpuObj.currentJob.remainingTime <= 0) {
            console.log("-----Job finished on CPU:", cpuObj.id,currentTime,"Job:", cpuObj.currentJob.id);
            cpuObj.currentJob.endTime = currentTime;
            cpuObj.currentJob.turnaroundTime = cpuObj.currentJob.endTime - cpuObj.currentJob.arrivalTime;
            cpuObj.history.push({
              start: cpuObj.currentSegmentStart,
              end: currentTime,
              job: cpuObj.currentJob.id,
            });
            cpuObj.currentJob = null;
            cpuObj.currentSegmentStart = null;
            cpuObj.quantumRemaining = quantum;
          }
          else if (cpuObj.quantumRemaining <= 0) {
            console.log("-----Quantum expired on CPU:", cpuObj.id,currentTime,"Job:", cpuObj.currentJob.id);
            cpuObj.history.push({
              start: cpuObj.currentSegmentStart,
              end: currentTime,
              job: cpuObj.currentJob.id,
            });
            readyQueue.push(cpuObj.currentJob);
            cpuObj.currentJob = null;
            cpuObj.currentSegmentStart = null;
            cpuObj.quantumRemaining = quantum;
          }
        }
      });
      console.log("**** ieration end ****");
    }
    console.log("***** end *****");
    setCpuTimeline(cpus);
    setJobs(jobsCopy);
    console.log("Jobs after calculation:", cpus);
  };

  const deleteJob = (jobId) => {
    setJobs(jobs.filter((job) => job.id !== jobId));
  };

  return (
    <div className={styles.page}>
      <h1>CPU Scheduling (SRTF with Quantum)</h1>
      <div className={styles.group}>
        <label htmlFor="algorithm">Select Algorithm</label>
        <select
          id="algorithm"
          value={selectedAlgorithm}
          onChange={(e) => setSelectedAlgorithm(e.target.value)}
        >
          {algorithms.map((algorithm) => (
            <option key={algorithm.name} value={algorithm.name}>
              {algorithm.label}
            </option>
          ))}
        </select>
      </div>
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
      <div className={styles.group}>
        <label htmlFor="quantum">Enter quantum duration (time units)</label>
        <input
          type="number"
          min="1"
          id="quantum"
          value={quantum}
          onChange={(e) => setQuantum(Number(e.target.value))}
          placeholder="Enter quantum duration"
        />
      </div>
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
        <button
          className={styles.button}
          onClick={() => {
            setJobs([]);
            setCpuTimeline([]);
          }}
        >
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
      {cpuTimeline.length > 0 && <CpuTimelineChart cpus={cpuTimeline} />}
    </div>
  );
}
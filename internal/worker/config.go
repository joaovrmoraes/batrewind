package worker

import "time"

type Config struct {
	InitialWorkerCount int
	MinWorkerCount     int
	MaxWorkerCount     int
	MaxRetries         int
	PollDuration       time.Duration

	EnableAutoscaling  bool
	ScaleUpThreshold   int64
	ScaleDownThreshold int64
	WorkerScaleFactor  float64
	CooldownPeriod     time.Duration
}

func DefaultConfig() Config {
	return Config{
		InitialWorkerCount: 2,
		MinWorkerCount:     2,
		MaxWorkerCount:     10,
		MaxRetries:         4,
		PollDuration:       time.Second,

		EnableAutoscaling:  true,
		ScaleUpThreshold:   15,
		ScaleDownThreshold: 5,
		WorkerScaleFactor:  2.0,
		CooldownPeriod:     15 * time.Second,
	}
}

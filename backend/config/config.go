package config

type Config struct {
	Port         string
	DatabasePath string
}

func Load() *Config {
	cfg := &Config{
		Port:         "8080",
		DatabasePath: "./data/dogowner.db",
	}
	return cfg
}

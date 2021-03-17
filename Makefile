WORKERS := cron-pair cron-reminder randengchat

.PHONY: all
all: $(WORKERS)

$(WORKERS):
	cd ./src/workers/$@ &&\
		wrangler publish

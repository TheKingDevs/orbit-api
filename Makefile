.PHONY: clean clean-cache run run-dev help

ROOT := $(shell pwd)
BACKEND := $(ROOT)/backend
FRONTEND := $(ROOT)/frontend

help:
	@echo "Comandos disponíveis:"
	@echo "  make clean       - Remove build artifacts e node_modules"
	@echo "  make clean-cache - Limpa caches de build (Next.js, Bun)"
	@echo "  make run         - Builda e roda backend e frontend em produção"
	@echo "  make run-dev     - Roda backend e frontend em desenvolvimento"
	@echo "  make help        - Mostra esta ajuda"

clean:
	rm -rf $(BACKEND)/dist $(FRONTEND)/.next $(BACKEND)/node_modules $(FRONTEND)/node_modules

clean-cache:
	cd $(BACKEND) && bun cache clean 2>/dev/null || true
	cd $(FRONTEND) && bun cache clean 2>/dev/null || true
	rm -rf $(FRONTEND)/.next/cache $(BACKEND)/dist

run:
	@echo "\n╭━━━⪩ 〔 Buildando backend e frontend...〕⪨━━"
	@cd $(BACKEND) && bun run build
	@cd $(FRONTEND) && bun run build
	@echo "\n╭━━━⪩ 〔 Iniciando backend e frontend (produção)...〕⪨━━"
	@set -e; \
	(cd $(BACKEND) && bun start) & BACK_PID=$$!; \
	(cd $(FRONTEND) && bun run start) & FRONT_PID=$$!; \
	trap 'kill $$BACK_PID $$FRONT_PID 2>/dev/null' INT TERM EXIT; \
	wait

run-dev:
	@echo "\n╭━━━⪩ 〔 Iniciando backend e frontend desenvolvimento...〕⪨━━"
	@set -e; \
	(cd $(BACKEND) && bun run dev) & BACK_PID=$$!; \
	(cd $(FRONTEND) && bun run dev) & FRONT_PID=$$!; \
	trap 'kill $$BACK_PID $$FRONT_PID 2>/dev/null' INT TERM EXIT; \
	wait

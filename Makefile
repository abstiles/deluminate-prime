.PHONY: clean package

SHELL := /bin/bash

MANIFEST := invert.js manifest.json
BUILD_DIR := build
NAME := $(shell basename $$(pwd))

LAST_VERSION_COMMIT := $(shell git blame manifest.json | grep \\bversion \
	| cut -d' ' -f1)
BUILD_NUM := $(shell git log $(LAST_VERSION_COMMIT)..HEAD --oneline 2>/dev/null \
	|| : | wc -l | tr -d ' ')
PKG_SUFFIX := $(shell git symbolic-ref --short HEAD \
	| sed '/^master$$/d;s/^/-/')

package: $(NAME)$(PKG_SUFFIX).zip

$(NAME).zip: $(MANIFEST)
	zip "$@" $(MANIFEST)

$(NAME)%.zip: $(MANIFEST) | $(BUILD_DIR)
	rm -f $(BUILD_DIR)/*
	cp $(MANIFEST) $(BUILD_DIR)/
	cp $(BUILD_DIR)/manifest.json $(BUILD_DIR)/manifest.json.orig
	sed -e '/"version"/s/"[^"]*$$/.$(BUILD_NUM)&/' \
		-e 's/"Deluminate"/"Deluminate$(PKG_SUFFIX)"/' \
		"$(BUILD_DIR)/manifest.json.orig" > "$(BUILD_DIR)/manifest.json"
	cd $(BUILD_DIR) && zip "../$@" $(MANIFEST)

$(BUILD_DIR):
	mkdir $@

clean:
	rm -f $(NAME)*.zip
	rm -rf $(BUILD_DIR)

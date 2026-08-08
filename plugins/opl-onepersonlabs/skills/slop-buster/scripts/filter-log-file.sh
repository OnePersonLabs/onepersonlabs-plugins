#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ne 1 ]]; then
  printf 'Usage: %s <codex-session-log.jsonl>\n' "$0" >&2
  exit 2
fi

log_file="$1"
max_output_chars="${SLOP_BUSTER_MAX_OUTPUT_CHARS:-2500}"

if [[ ! -f "$log_file" ]]; then
  printf 'Codex session log does not exist: %s\n' "$log_file" >&2
  exit 1
fi

if [[ ! "$max_output_chars" =~ ^[1-9][0-9]*$ ]]; then
  printf 'SLOP_BUSTER_MAX_OUTPUT_CHARS must be a positive integer: %s\n' "$max_output_chars" >&2
  exit 2
fi

perl -Mstrict -Mwarnings -e '
  my ($log_file, $max_output_chars) = @ARGV;

  open my $log_fh, "<", $log_file
    or die "Failed to read Codex session log $log_file: $!\n";

  print "SLOP_BUSTER_CANDIDATE_START\tlogPath=$log_file\tmaxOutputChars=$max_output_chars\n";

  my $line_number = 0;
  my $lines_emitted = 0;

  my $user_record = qr/"type":"(?:response_item|event_msg)","payload":\{(?:"type":"message","role":"user"|"type":"user_message","message":)/;
  my $assistant_record = qr/"type":"(?:response_item|event_msg)","payload":\{(?:"type":"message","id":"msg_[^"]+","role":"assistant"|"type":"agent_message","message":)/;
  my $bootstrap_user = qr/"(?:# AGENTS\.md instructions for |<environment_context>|<skill>\\n<name>|<INSTRUCTIONS>|--- project-doc ---)/;
  my $agent_signal = qr/(?i)\b(?:abort|blocked|caught|clean|commit|correction|dirty|error|fail(?:ed|ing|ure)?|fix(?:ed|ing)?|miss(?:ed|ing)?|mistake|push(?:ed|ing)?|recover(?:ed|y)?|rerun(?:ning)?|retry(?:ing)?|slop|stale|validat(?:e|ed|ion)|wrong)\b/;

  while (my $line = <$log_fh>) {
    ++$line_number;
    my $is_user_candidate = $line =~ $user_record && $line !~ $bootstrap_user;
    my $is_agent_candidate = $line =~ $assistant_record && $line =~ $agent_signal;
    next unless $is_user_candidate || $is_agent_candidate;

    ++$lines_emitted;
    my $truncated = length($line) > $max_output_chars ? "true" : "false";
    my $output_line = $truncated eq "true" ? substr($line, 0, $max_output_chars) : $line;
    chomp $output_line;
    print "[$line_number] truncated=$truncated $output_line\n";
  }

  print "SLOP_BUSTER_CANDIDATE_END\tlinesEmitted=$lines_emitted\n";
' "$log_file" "$max_output_chars"

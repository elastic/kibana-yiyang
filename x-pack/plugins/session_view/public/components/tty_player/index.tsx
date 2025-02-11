/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButton,
  EuiBetaBadge,
} from '@elastic/eui';
import { throttle } from 'lodash';
import { ProcessEvent } from '../../../common/types/process_tree';
import { TTYSearchBar } from '../tty_search_bar';
import { TTYTextSizer } from '../tty_text_sizer';
import { useStyles } from './styles';
import {
  DEFAULT_TTY_ROWS,
  DEFAULT_TTY_COLS,
  DEFAULT_TTY_FONT_SIZE,
} from '../../../common/constants';
import { useFetchIOEvents, useIOLines, useXtermPlayer } from './hooks';
import { TTYPlayerControls } from '../tty_player_controls';
import { BETA, TOGGLE_TTY_PLAYER, DETAIL_PANEL } from '../session_view/translations';

export interface TTYPlayerDeps {
  show: boolean;
  sessionEntityId: string;
  onClose(): void;
  isFullscreen: boolean;
  onJumpToEvent(event: ProcessEvent): void;
  autoSeekToEntityId?: string;
}

export const TTYPlayer = ({
  show,
  sessionEntityId,
  onClose,
  isFullscreen,
  onJumpToEvent,
  autoSeekToEntityId,
}: TTYPlayerDeps) => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetching } = useFetchIOEvents(sessionEntityId);
  const { lines, processStartMarkers } = useIOLines(data?.pages);
  const [fontSize, setFontSize] = useState(DEFAULT_TTY_FONT_SIZE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAutoSeekEntityId, setCurrentAutoSeekEntityId] = useState('');

  const { search, currentLine, seekToLine } = useXtermPlayer({
    ref,
    isPlaying,
    setIsPlaying,
    lines,
    fontSize,
    hasNextPage,
    fetchNextPage,
    isFetching,
  });

  const currentProcessEvent = lines[Math.min(lines.length - 1, currentLine)]?.event;
  const tty = currentProcessEvent?.process?.tty;

  useEffect(() => {
    if (
      autoSeekToEntityId &&
      currentAutoSeekEntityId !== autoSeekToEntityId &&
      currentProcessEvent?.process?.entity_id !== autoSeekToEntityId
    ) {
      const foundMarker = processStartMarkers.find((marker) => {
        if (marker.event.process?.entity_id === autoSeekToEntityId) {
          return true;
        }
        return false;
      });

      if (foundMarker) {
        seekToLine(foundMarker.line);
        setCurrentAutoSeekEntityId(autoSeekToEntityId);
      } else {
        seekToLine(lines.length - 1); // seek to end to force next page to load.
      }
    }
  }, [
    autoSeekToEntityId,
    currentAutoSeekEntityId,
    currentProcessEvent?.process?.entity_id,
    lines.length,
    processStartMarkers,
    seekToLine,
  ]);

  const validTTY = tty?.rows && tty?.rows > 1 && tty?.rows < 1000;
  if (tty && !validTTY) {
    tty.rows = DEFAULT_TTY_ROWS;
    tty.columns = DEFAULT_TTY_COLS;
  }

  const styles = useStyles(tty, show);

  const onSeekLine = useMemo(() => {
    return throttle((line: number) => {
      seekToLine(line);
    }, 100);
  }, [seekToLine]);

  const onTogglePlayback = useCallback(() => {
    // if at the end, seek to beginning
    if (currentLine >= lines.length - 1) {
      seekToLine(0);
    }
    setIsPlaying(!isPlaying);
  }, [currentLine, isPlaying, lines.length, seekToLine]);

  return (
    <div css={styles.container}>
      <EuiPanel hasShadow={false} borderRadius="none" hasBorder={false} css={styles.header}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiBetaBadge label={BETA} size="s" css={styles.betaBadge} />
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="sessionView:TTYSearch">
            <TTYSearchBar lines={lines} seekToLine={seekToLine} xTermSearchFn={search} />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              isSelected={true}
              display="fill"
              isLoading={isFetching}
              iconType="apmTrace"
              onClick={onClose}
              size="m"
              aria-label={TOGGLE_TTY_PLAYER}
              data-test-subj="sessionView:TTYPlayerClose"
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon iconType="refresh" display="empty" size="m" disabled={true} />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon iconType="eye" disabled={true} size="m" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton iconType="list" disabled={true}>
              {DETAIL_PANEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <div ref={scrollRef} className="eui-scrollBar" css={styles.scrollPane}>
        <div ref={ref} data-test-subj="sessionView:TTYPlayer" css={styles.terminal} />
      </div>

      <TTYPlayerControls
        currentProcessEvent={currentProcessEvent}
        processStartMarkers={processStartMarkers}
        isPlaying={isPlaying}
        currentLine={currentLine}
        linesLength={lines.length}
        onSeekLine={onSeekLine}
        onTogglePlayback={onTogglePlayback}
        onClose={onClose}
        onJumpToEvent={onJumpToEvent}
        textSizer={
          <TTYTextSizer
            tty={tty}
            containerHeight={scrollRef?.current?.offsetHeight || 0}
            fontSize={fontSize}
            onFontSizeChanged={setFontSize}
            isFullscreen={isFullscreen}
          />
        }
      />
    </div>
  );
};

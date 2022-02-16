import TimezoneSelect, {
  ITimezoneOption,
} from '@james-camilleri/react-timezone-select'
import { Props } from '@sanity/form-builder/dist/dts/inputs/DateInputs/DateTimeInput'
import { DateTimeInput } from '@sanity/form-builder/lib/inputs/DateInputs/DateTimeInput'
import PatchEvent, { set } from '@sanity/form-builder/PatchEvent'
import { Stack } from '@sanity/ui'
import { add } from 'date-fns'
import React, {
  ForwardedRef,
  forwardRef,
  useCallback,
  useRef,
  useState,
} from 'react'
import { Required } from 'utility-types'

interface ZonedDateTime {
  dateTime: string
  timeZone: {
    value: string
    offset: number
  }
}

const DEFAULT_TIME_ZONE = {
  value: 'Europe/London',
  offset: 0,
}

// Reframes a UTC date as if it were in the user's
// current time zone, to enable easier time zone shifting.
// e.g. 10:00 UTC -> 12:00 UTC if the user is currently in CEST (+2).
function uctDateToLocal(utcDate: string): Date {
  const date = new Date(utcDate)
  const offsetInMinutes = date.getTimezoneOffset()
  return add(date, { minutes: offsetInMinutes * -1 })
}

function localDateToUtc(date: Date | string): Date {
  if (!date) return null
  const dateTime = typeof date === 'string' ? new Date(date) : date
  const offsetInMinutes = dateTime.getTimezoneOffset()
  return add(dateTime, { minutes: offsetInMinutes })
}

function offsetTimeZone(
  date: Date | string,
  timeZone: ITimezoneOption | number,
  reverse = false,
): Date {
  if (!date) return null

  const dateTime = typeof date === 'string' ? new Date(date) : date
  const offset = typeof timeZone === 'number' ? timeZone : timeZone.offset
  const direction = reverse ? 1 : -1

  // date-fns rounds hours, so convert offset to minutes.
  return add(dateTime, { minutes: offset * 60 * direction })
}

// This component adjusts the DateTime selected from the default Sanity date
// picker to be in the selected time zone. Since the default selector
// automatically converts to UTC, the following steps are taken to "reverse
// engineer" the UTC date corresponding to the selected date and time zone:
//
// 1. Reverse Sanity's UTC conversion
// (e.g. A UTC time of 10:00 if the user is in CEST (UTC+2) means that the
// user actually picked 12:00. By resetting the time to 12:00 we can correctly
// apply the time zone offset.)
//
// 2. Offset the selected time by the correct amount.
// (e.g. If the user selected Mountain Time (UTC-7), 12:00 would be 19:00 UTC -
// 12:00 + 07:00.)
//
// 3. Store the calculated UTC time to maintain coherence with Sanity's time
// storage format and the front end.
//
// 4. Revert steps 1 & 2 to show have Sanity's DateTime selector display the
// value the user selected.
export default forwardRef(
  (props: Props, forwardedRef: ForwardedRef<HTMLInputElement>) => {
    const { onChange, type, value } = props

    const normalisedValue =
      typeof value === 'string' ? { dateTime: value } : value
    const { dateTime, timeZone = DEFAULT_TIME_ZONE } = normalisedValue || {}

    const [selectedTimeZone, setSelectedTimeZone] =
      useState<Required<ITimezoneOption, 'offset'>>(timeZone)

    const updateZonedDateTime = useCallback(
      (newZonedDateTime: ZonedDateTime) =>
        onChange(PatchEvent.from(set(newZonedDateTime))),
      [onChange],
    )

    const onDateTimeChange = useCallback(
      ({ patches }) => {
        const inputDate = patches?.[0]?.value
        if (!inputDate) return

        const newDateTime = offsetTimeZone(
          uctDateToLocal(inputDate),
          selectedTimeZone,
        ).toISOString()

        updateZonedDateTime({
          dateTime: newDateTime,
          timeZone: selectedTimeZone,
        })
      },
      [updateZonedDateTime, selectedTimeZone],
    )

    const onTimeZoneChange = useCallback(
      newTimeZone => {
        const newDateTime = offsetTimeZone(
          dateTime,
          newTimeZone.offset - timeZone.offset,
        ).toISOString()

        updateZonedDateTime({ dateTime: newDateTime, timeZone: newTimeZone })
        setSelectedTimeZone(newTimeZone)
      },
      [dateTime, updateZonedDateTime, setSelectedTimeZone],
    )

    // Back-convert stored dateTime to display correctly on screen.
    const valueForDisplay = offsetTimeZone(
      localDateToUtc(dateTime),
      timeZone,
      true,
    )

    const utcTime = `${dateTime?.split('T')[0]} ${dateTime
      ?.split('T')[1]
      ?.replace(/:00\..+/, '')}`

    return (
      <Stack space={2}>
        <DateTimeInput
          {...props}
          ref={forwardedRef}
          onChange={onDateTimeChange}
          value={valueForDisplay}
        />
        <label id="a-label">Time zone</label>
        <TimezoneSelect
          value={selectedTimeZone}
          onChange={onTimeZoneChange}
          name="time-zone"
          date={valueForDisplay}
          styles={type?.options?.styles}
        />
        {type?.options?.showUtc ? (
          <code style={{ fontSize: '1rem', paddingLeft: '0.5rem' }}>
            {utcTime} UTC
          </code>
        ) : undefined}
      </Stack>
    )
  },
)

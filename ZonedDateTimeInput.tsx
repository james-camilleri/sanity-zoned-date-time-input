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
import TimezoneSelect, { ITimezoneOption } from 'react-timezone-select'

interface ZonedDateTime {
  dateTime: string
  timeZone: {
    value: string
    offset?: number // TODO: This shouldn't really be optional
  }
}

const DEFAULT_TIME_ZONE = {
  value: 'Europe/London',
  offset: 0,
}

// TODO: Tmprove this description.
// Offset an internal UTC date to be relative to the user's current time zone,
// e.g. 10:00 UTC -> 12:00 UTC if the user in CEST (+2).
function makeUtcTimeLocal(utcDate: string): Date {
  const date = new Date(utcDate)
  const offsetInMinutes = date.getTimezoneOffset()
  return add(date, { minutes: offsetInMinutes * -1 })
}

function offsetTimeZone(
  date: Date | string,
  timeZone: ITimezoneOption | number,
): Date {
  const dateTime = typeof date === 'string' ? new Date(date) : date
  const offset = typeof timeZone === 'number' ? timeZone : timeZone.offset
  // date-fns rounds hours, so convert offset to minutes.
  return add(dateTime, { minutes: offset * 60 * -1 })
}

// TODO: Merge into offset function?
function revertTimeZoneOffset(
  date: Date | string,
  timeZone: ITimezoneOption,
): Date {
  if (!date) return null
  const dateTime = typeof date === 'string' ? new Date(date) : date
  // date-fns rounds hours, so convert offset to minutes.
  return add(dateTime, { minutes: timeZone.offset * 60 })
}

// TODO: Merge into UTC offset function?
function revertUtcOffset(date: Date | string): string {
  if (!date) return null
  const dateTime = typeof date === 'string' ? new Date(date) : date
  const offsetInMinutes = dateTime.getTimezoneOffset()
  return add(dateTime, { minutes: offsetInMinutes }).toISOString()
}

export default forwardRef(
  (props: Props, forwardedRef: ForwardedRef<HTMLInputElement>) => {
    const { onChange, type, value } = props

    const normalisedValue =
      typeof value === 'string' ? { dateTime: value } : value
    const { dateTime, timeZone = DEFAULT_TIME_ZONE } = normalisedValue || {}

    const [selectedTimeZone, setSelectedTimeZone] =
      useState<ITimezoneOption>(timeZone)

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
          makeUtcTimeLocal(inputDate),
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
    const valueForDisplay = revertTimeZoneOffset(
      revertUtcOffset(dateTime),
      timeZone,
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
          styles={{
            control: (provided, state) => ({
              ...provided,
              borderRadius: 0,
              border: 0,
              boxShadow: state.isFocused
                ? 'inset 0 0 0 2px #39407a'
                : 'inset 0 0 0 1px #bfc1c8',
              minHeight: '35px',
            }),
            menu: provided => ({
              ...provided,
              borderRadius: 0,
              marginTop: '5px',
              zIndex: 100,
            }),
            dropdownIndicator: provided => ({
              ...provided,
              margin: '0.25rem',
              padding: '4px',
              width: '27px',
              height: '27px',
            }),
            indicatorSeparator: provided => ({
              ...provided,
              margin: 0,
              backgroundColor: '#bfc1c8',
            }),
            option: (provided, state) => ({
              ...provided,
              backgroundColor: state.isFocused
                ? '#bdc5e3'
                : state.isSelected
                ? '#39407a'
                : provided.backgroundColor,
              color: state.isSelected ? '#fff' : provided.color,
            }),
          }}
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

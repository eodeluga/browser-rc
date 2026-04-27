import { z } from 'zod'

import {
  extractionRequestSchema,
  type ExtractionMode,
  type ExtractionRequest,
  type NormalisationHints,
  type OutputFieldType,
  type OutputValidation,
} from '../contracts/extraction.schema.js'
import { BrowserManagerService } from './browser-manager.service.js'

interface ExtractionResult {
  data: unknown
  mode: ExtractionMode
}

interface ExtractionServiceDependencies {
  browserManagerService: Pick<BrowserManagerService, 'getPage' | 'touchSession'>
}

interface SerializableFieldDefinition {
  attribute?: string
  normalisation?: SerializableNormalisationHints
}

interface SerializableNormalisationHints {
  collapseWhitespace?: boolean
  lowercase?: boolean
  trim?: boolean
}

class ExtractionService {
  public constructor(private readonly dependencies: ExtractionServiceDependencies) {}

  private createFieldSchema(fieldType: OutputFieldType): z.ZodType<boolean | number | string> {
    switch (fieldType) {
      case 'boolean': {
        return z.boolean()
      }

      case 'number': {
        return z.number()
      }

      case 'string': {
        return z.string()
      }
    }
  }

  private createObjectSchema(outputValidation: OutputValidation): z.ZodObject<Record<string, z.ZodTypeAny>> {
    const schemaShape: Record<string, z.ZodTypeAny> = {}
    const sortedEntries = Object.entries(outputValidation)
      .sort(([firstFieldName], [secondFieldName]) => {
        return firstFieldName.localeCompare(secondFieldName)
      })

    for (const [fieldName, fieldType] of sortedEntries) {
      schemaShape[fieldName] = this.createFieldSchema(fieldType)
    }

    return z.object(schemaShape)
  }

  private async extractListData(
    extractionRequest: ExtractionRequest,
    normalisationHints: NormalisationHints | undefined,
    sessionId: string
  ): Promise<unknown[] | null> {
    const browserPage = this.dependencies.browserManagerService.getPage(sessionId)

    if (!browserPage || extractionRequest.mode !== 'list') {
      return null
    }

    const listData = await browserPage.evaluate((payload) => {
      const applyNormalisation = (
        inputValue: string,
        mergedNormalisationHints: SerializableNormalisationHints | undefined
      ): string => {
        const shouldCollapseWhitespace = mergedNormalisationHints?.collapseWhitespace ?? true
        const shouldLowercase = mergedNormalisationHints?.lowercase ?? false
        const shouldTrim = mergedNormalisationHints?.trim ?? true
        let normalisedValue = inputValue

        if (shouldCollapseWhitespace) {
          normalisedValue = normalisedValue.replace(/\s+/g, ' ')
        }

        if (shouldTrim) {
          normalisedValue = normalisedValue.trim()
        }

        if (shouldLowercase) {
          normalisedValue = normalisedValue.toLowerCase()
        }

        return normalisedValue
      }

      const readNodeValue = (
        domElement: Element,
        fieldDefinition: SerializableFieldDefinition,
        fallbackNormalisationHints: SerializableNormalisationHints | undefined
      ): string => {
        const extractedValue = fieldDefinition.attribute
          ? domElement.getAttribute(fieldDefinition.attribute) ?? ''
          : domElement.textContent ?? ''

        return applyNormalisation(extractedValue, fieldDefinition.normalisation ?? fallbackNormalisationHints)
      }

      const repeatedElements = Array.from(document.querySelectorAll(payload.itemSelector))
      const outputRows: Record<string, unknown>[] = []

      for (const repeatedElement of repeatedElements) {
        const rowData: Record<string, unknown> = {}

        for (const [fieldName, fieldDefinition] of Object.entries(payload.fields)) {
          if (fieldDefinition.all) {
            const fieldValues = Array.from(repeatedElement.querySelectorAll(fieldDefinition.selector))
              .map((fieldElement) => {
                return readNodeValue(fieldElement, fieldDefinition, payload.normalisationHints)
              })
            rowData[fieldName] = fieldValues

            continue
          }

          const singleElement = repeatedElement.querySelector(fieldDefinition.selector)

          rowData[fieldName] = singleElement
            ? readNodeValue(singleElement, fieldDefinition, payload.normalisationHints)
            : null
        }

        outputRows.push(rowData)
      }

      return outputRows
    }, {
      fields: extractionRequest.fields,
      itemSelector: extractionRequest.itemSelector,
      normalisationHints,
    })

    this.dependencies.browserManagerService.touchSession(sessionId)

    return listData
  }

  private async extractObjectData(
    extractionRequest: ExtractionRequest,
    normalisationHints: NormalisationHints | undefined,
    sessionId: string
  ): Promise<Record<string, unknown> | null> {
    const browserPage = this.dependencies.browserManagerService.getPage(sessionId)

    if (!browserPage) {
      return null
    }

    const objectData = await browserPage.evaluate((payload) => {
      const applyNormalisation = (
        inputValue: string,
        mergedNormalisationHints: SerializableNormalisationHints | undefined
      ): string => {
        const shouldCollapseWhitespace = mergedNormalisationHints?.collapseWhitespace ?? true
        const shouldLowercase = mergedNormalisationHints?.lowercase ?? false
        const shouldTrim = mergedNormalisationHints?.trim ?? true
        let normalisedValue = inputValue

        if (shouldCollapseWhitespace) {
          normalisedValue = normalisedValue.replace(/\s+/g, ' ')
        }

        if (shouldTrim) {
          normalisedValue = normalisedValue.trim()
        }

        if (shouldLowercase) {
          normalisedValue = normalisedValue.toLowerCase()
        }

        return normalisedValue
      }

      const readNodeValue = (
        domElement: Element,
        fieldDefinition: SerializableFieldDefinition,
        fallbackNormalisationHints: SerializableNormalisationHints | undefined
      ): string => {
        const extractedValue = fieldDefinition.attribute
          ? domElement.getAttribute(fieldDefinition.attribute) ?? ''
          : domElement.textContent ?? ''

        return applyNormalisation(extractedValue, fieldDefinition.normalisation ?? fallbackNormalisationHints)
      }

      const outputObject: Record<string, unknown> = {}

      for (const [fieldName, fieldDefinition] of Object.entries(payload.fields)) {
        if (fieldDefinition.all) {
          const fieldValues = Array.from(document.querySelectorAll(fieldDefinition.selector))
            .map((fieldElement) => {
              return readNodeValue(fieldElement, fieldDefinition, payload.normalisationHints)
            })
          outputObject[fieldName] = fieldValues

          continue
        }

        const singleElement = document.querySelector(fieldDefinition.selector)

        outputObject[fieldName] = singleElement
          ? readNodeValue(singleElement, fieldDefinition, payload.normalisationHints)
          : null
      }

      return outputObject
    }, {
      fields: extractionRequest.fields,
      normalisationHints,
    })

    this.dependencies.browserManagerService.touchSession(sessionId)

    return objectData
  }

  public async extract(
    extractionRequest: ExtractionRequest | undefined,
    normalisationHints: NormalisationHints | undefined,
    sessionId: string
  ): Promise<ExtractionResult | null> {
    const browserPage = this.dependencies.browserManagerService.getPage(sessionId)

    if (!browserPage) {
      return null
    }

    if (!extractionRequest) {
      const defaultExtraction = await browserPage.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
        }
      })

      this.dependencies.browserManagerService.touchSession(sessionId)

      return {
        data: defaultExtraction,
        mode: 'object',
      }
    }

    const parsedRequest = extractionRequestSchema.safeParse(extractionRequest)

    if (!parsedRequest.success) {
      throw new Error('Invalid extraction request payload')
    }

    const extractionMode = parsedRequest.data.mode
    const extractedData = extractionMode === 'list'
      ? await this.extractListData(parsedRequest.data, normalisationHints, sessionId)
      : await this.extractObjectData(parsedRequest.data, normalisationHints, sessionId)

    if (!extractedData) {
      return null
    }

    return {
      data: extractedData,
      mode: extractionMode,
    }
  }

  public validateExtractedData(
    extractedData: unknown,
    outputValidation: OutputValidation,
    mode: ExtractionMode
  ): z.ZodSafeParseResult<unknown> {
    const objectSchema = this.createObjectSchema(outputValidation)
    const validationSchema = mode === 'list'
      ? z.array(objectSchema)
      : objectSchema

    return validationSchema.safeParse(extractedData)
  }
}

export { ExtractionService, type ExtractionResult, type ExtractionServiceDependencies }

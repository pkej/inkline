import { Spec } from 'comment-parser';
import { ManifestCSSVariable, ContextBlock } from '../types';

export const sassValueRegEx = /-*[\w-]+:(.+);/;
export const sassInterpolationRegEx = /^#{(.*)}$/;

export const mapBlocksToVariants = (blocks: ContextBlock[]) =>
    blocks.reduce((acc: any, { description, tags, context }) => {
        const { name } = tags.find(({ tag }) => tag === 'name') as Spec;
        const { name: type } = (tags.find(({ tag }) => tag === 'type') || { name: '' }) as Spec;
        const value = context[0]
            .replace(sassValueRegEx, '$1')
            .trim()
            .replace(sassInterpolationRegEx, '$1');

        if (type === 'variant') {
            acc.push({
                name,
                type,
                description,
                variables: []
            });
        } else {
            acc[acc.length - 1].variables.push({
                name,
                type,
                value,
                description
            });
        }

        return acc;
    }, []);

export const mapBlocksToVariables = (blocks: ContextBlock[]): ManifestCSSVariable[] =>
    blocks.map(({ description, tags }) => {
        const { name } = tags.find(({ tag }) => tag === 'name') as Spec;
        const { name: type } = (tags.find(({ tag }) => tag === 'type') || { name: '' }) as Spec;

        return {
            name,
            description,
            type
        };
    });

export function mapVariantsToVariables(
    variables: ManifestCSSVariable[],
    unmappedVariants: ManifestCSSVariable[][],
    seenVariants: string[] = []
): ManifestCSSVariable[] {
    return variables.reduce<ManifestCSSVariable[]>((acc, variable) => {
        const variants = unmappedVariants.flat().filter(({ name }) => {
            const variableNameBasedOnVariant = name
                ?.split('--')
                .filter((part, index) => index !== 2)
                .join('--');

            return variableNameBasedOnVariant === variable.name && !seenVariants.includes(name!);
        });

        if (variants.length > 0) {
            seenVariants.push(...variants.map(({ name }) => name!));
        }

        if (!acc.find(({ name }) => name === variable.name)) {
            acc.push({
                name: variable.name,
                ...(variable.value
                    ? {
                          value: Array.isArray(variable.value)
                              ? mapVariantsToVariables(
                                    variable.value,
                                    unmappedVariants,
                                    seenVariants
                                )
                              : variable.value
                      }
                    : {}),
                ...(variants.length > 0 ? { variants } : {})
            });
        }

        return acc;
    }, []);
}

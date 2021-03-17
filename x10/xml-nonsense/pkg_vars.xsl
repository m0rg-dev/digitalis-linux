<?xml version="1.0" ?>
<xsl:stylesheet version="1.1"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:dyn="http://exslt.org/dynamic">
    <xsl:output method="xml" indent="yes" doctype-system="package.dtd"/>

    <xsl:template name="string-replace-multiple">
        <xsl:param name="text" />
        <xsl:param name="subs" />
        <xsl:if test="string-length($text) > 0">
            <xsl:variable name="pattern" select="$subs[starts-with($text, concat('${', @name, '}'))][1]"/>
            <xsl:variable name="replacement" select="dyn:evaluate($pattern/@source)"/>
            <xsl:choose>
                <xsl:when test="not($pattern)">
                    <xsl:value-of select="substring($text, 1, 1)"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="$replacement"/>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:variable name="chop-start">
                <xsl:choose>
                    <xsl:when test="not($pattern)">2</xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="string-length($pattern/@name) + 4"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:variable>
            <xsl:call-template name="string-replace-multiple">
                <xsl:with-param name="text" select="substring($text, $chop-start)"/>
                <xsl:with-param name="subs" select="$subs"/>
            </xsl:call-template>
        </xsl:if>
    </xsl:template>

    <xsl:template match="@*">
        <xsl:attribute name="{name()}">
            <xsl:call-template name="string-replace-multiple">
                <xsl:with-param name="text" select="."/>
                <xsl:with-param name="subs" select="document('pkg_vars.xml')/substitutions/sub"/>
            </xsl:call-template>
        </xsl:attribute>
    </xsl:template>
</xsl:stylesheet>
<?xml version="1.0" ?>
<xsl:stylesheet version="1.1"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:exsl="http://exslt.org/common"
    xmlns:dyn="http://exslt.org/dynamic">
    <xsl:output method="text" omit-xml-declaration="yes" indent="no"/>

    <xsl:template match="node()|@*">
        <xsl:copy>
            <xsl:apply-templates select="node()|@*"/>
        </xsl:copy>
    </xsl:template>

    <xsl:include href="pkg_vars.xsl"/>

    <xsl:template match="/package/build-template">
        <xsl:variable name="template">
            <xsl:text>document('</xsl:text>
            <xsl:value-of select="@href"/>
            <xsl:text>')</xsl:text>
        </xsl:variable>
        <xsl:copy-of select="dyn:evaluate($template)"/>
    </xsl:template>

    <xsl:template match="/package/build-script" mode="pass2">
        <xsl:copy-of select="."/>
    </xsl:template>

    <xsl:template match="/">
        <xsl:variable name="source">
            <xsl:apply-templates/>
        </xsl:variable>
        <xsl:apply-templates mode="pass2" select="exsl:node-set($source)"/>
    </xsl:template>
</xsl:stylesheet>
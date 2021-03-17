<?xml version="1.0" ?>
<xsl:stylesheet version="1.1"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:exsl="http://exslt.org/common">
    <xsl:output method="text" omit-xml-declaration="yes" indent="no"/>

    <xsl:template match="node()|@*">
        <xsl:copy>
            <xsl:apply-templates select="node()|@*"/>
        </xsl:copy>
    </xsl:template>

    <xsl:include href="pkg_vars.xsl"/>

    <xsl:template name="basename">
        <xsl:param name="path"/>
        <xsl:choose>
            <xsl:when test="not(contains($path, '/'))">
                <xsl:value-of select="$path"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:call-template name="basename">
                    <xsl:with-param name="path" select="substring-after($path, '/')"/>
                </xsl:call-template>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template name="download-one-source">
        <xsl:param name="src"/>
        <xsl:variable name="basename">
            <xsl:call-template name="basename">
                <xsl:with-param name="path" select="$src/@url"/>
            </xsl:call-template>
        </xsl:variable>

        echo '<xsl:value-of select="@sha256"/>  /x10/srcs/<xsl:value-of select="$basename"/>' | sha256sum -c || \
            curl -L <xsl:value-of select="$src/@url"/> -o /x10/srcs/<xsl:value-of select="$basename"/>
        echo '<xsl:value-of select="@sha256"/>  /x10/srcs/<xsl:value-of select="$basename"/>' | sha256sum -c
    </xsl:template>

    <xsl:template match="/">
        <xsl:variable name="source">
            <xsl:apply-templates/>
        </xsl:variable>
        <xsl:text>set -ex&#xa;</xsl:text>
        <xsl:text>mkdir -p /x10/srcs/&#xa;</xsl:text>
        <xsl:for-each select="exsl:node-set($source)/package/source">
            <xsl:call-template name="download-one-source">
                <xsl:with-param name="src" select="."/>
            </xsl:call-template>
        </xsl:for-each>
    </xsl:template>
</xsl:stylesheet>